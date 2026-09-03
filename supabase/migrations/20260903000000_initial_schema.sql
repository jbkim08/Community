-- Student Community initial database schema
-- Apply with: supabase db push

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

-- Reuse one trigger function to keep updated_at current on every mutable table.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  name text not null,
  avatar_url text,
  bio text,
  github_url text,
  portfolio_url text,
  training_course text,
  training_started_at date,
  training_ended_at date,
  role text not null default 'MEMBER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_name_length_check
    check (char_length(btrim(name)) between 1 and 50),
  constraint profiles_bio_length_check
    check (bio is null or char_length(bio) <= 500),
  constraint profiles_github_url_check
    check (github_url is null or github_url ~* '^https?://'),
  constraint profiles_portfolio_url_check
    check (portfolio_url is null or portfolio_url ~* '^https?://'),
  constraint profiles_training_dates_check
    check (
      training_started_at is null
      or training_ended_at is null
      or training_started_at <= training_ended_at
    ),
  constraint profiles_role_check
    check (role in ('ADMIN', 'MEMBER'))
);

-- SECURITY DEFINER avoids an RLS recursion when an RLS policy checks profiles.
create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'ADMIN'
  );
$$;

create table public.posts (
  id uuid primary key default extensions.gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  category text not null,
  title text not null,
  content text not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint posts_category_check
    check (category in ('NOTICE', 'FREE', 'QUESTION', 'INFO', 'JOB')),
  constraint posts_title_length_check
    check (char_length(btrim(title)) between 1 and 200),
  constraint posts_content_length_check
    check (char_length(btrim(content)) between 1 and 10000),
  constraint posts_image_url_check
    check (
      image_url is null
      or image_url ~* '\.(jpg|jpeg|png|webp)(\?.*)?$'
    )
);

create table public.comments (
  id uuid primary key default extensions.gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint comments_content_length_check
    check (char_length(btrim(content)) between 1 and 1000)
);

create table public.post_likes (
  id uuid primary key default extensions.gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint post_likes_post_id_profile_id_key unique (post_id, profile_id)
);

create table public.recruitments (
  id uuid primary key default extensions.gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  status text not null default 'OPEN',
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint recruitments_type_check
    check (type in ('PROJECT', 'STUDY', 'ETC')),
  constraint recruitments_status_check
    check (status in ('OPEN', 'CLOSED')),
  constraint recruitments_title_length_check
    check (char_length(btrim(title)) between 1 and 200),
  constraint recruitments_content_length_check
    check (char_length(btrim(content)) between 1 and 10000)
);

create table public.recruitment_members (
  id uuid primary key default extensions.gen_random_uuid(),
  recruitment_id uuid not null references public.recruitments (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint recruitment_members_recruitment_id_profile_id_key
    unique (recruitment_id, profile_id)
);

create table public.jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  company_name text not null,
  title text not null,
  location text,
  description text not null,
  application_url text not null,
  deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint jobs_company_name_length_check
    check (char_length(btrim(company_name)) between 1 and 100),
  constraint jobs_title_length_check
    check (char_length(btrim(title)) between 1 and 200),
  constraint jobs_description_length_check
    check (char_length(btrim(description)) between 1 and 10000),
  constraint jobs_application_url_check
    check (application_url ~* '^https?://'),
  constraint jobs_deadline_check
    check (deadline is null or deadline >= created_at::date)
);

-- Index foreign keys and the columns used by common list filters and RLS checks.
create index idx_profiles_training_course_started_at
  on public.profiles (training_course, training_started_at);
create index idx_posts_author_id on public.posts (author_id);
create index idx_posts_category_created_at on public.posts (category, created_at desc);
create index idx_comments_post_id_created_at on public.comments (post_id, created_at);
create index idx_comments_author_id on public.comments (author_id);
create index idx_post_likes_post_id on public.post_likes (post_id);
create index idx_post_likes_profile_id on public.post_likes (profile_id);
create index idx_recruitments_author_id on public.recruitments (author_id);
create index idx_recruitments_status_created_at
  on public.recruitments (status, created_at desc);
create index idx_recruitment_members_profile_id
  on public.recruitment_members (profile_id);
create index idx_jobs_author_id on public.jobs (author_id);
create index idx_jobs_deadline on public.jobs (deadline);

-- Create a profile whenever an Auth user is created. Every new user starts as MEMBER.
create function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    lower(new.email),
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        '새 회원'
      ),
      50
    )
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.create_profile_for_new_user();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger set_posts_updated_at
  before update on public.posts
  for each row execute function private.set_updated_at();
create trigger set_comments_updated_at
  before update on public.comments
  for each row execute function private.set_updated_at();
create trigger set_post_likes_updated_at
  before update on public.post_likes
  for each row execute function private.set_updated_at();
create trigger set_recruitments_updated_at
  before update on public.recruitments
  for each row execute function private.set_updated_at();
create trigger set_recruitment_members_updated_at
  before update on public.recruitment_members
  for each row execute function private.set_updated_at();
create trigger set_jobs_updated_at
  before update on public.jobs
  for each row execute function private.set_updated_at();

-- Enable RLS before exposing the tables through Supabase's Data API.
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.recruitments enable row level security;
alter table public.recruitment_members enable row level security;
alter table public.jobs enable row level security;

-- Start with no client privileges and grant only the operations each table needs.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.posts from anon, authenticated;
revoke all on table public.comments from anon, authenticated;
revoke all on table public.post_likes from anon, authenticated;
revoke all on table public.recruitments from anon, authenticated;
revoke all on table public.recruitment_members from anon, authenticated;
revoke all on table public.jobs from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (
  name,
  avatar_url,
  bio,
  github_url,
  portfolio_url,
  training_course,
  training_started_at,
  training_ended_at
) on table public.profiles to authenticated;

grant select, insert, update, delete on table public.posts to authenticated;
grant select, insert, update, delete on table public.comments to authenticated;
grant select, insert, delete on table public.post_likes to authenticated;
grant select, insert, update, delete on table public.recruitments to authenticated;
grant select, insert, delete on table public.recruitment_members to authenticated;
grant select, insert, update, delete on table public.jobs to authenticated;

-- Profiles: signed-in members can browse profiles and update only their own editable fields.
create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated
  using ((select auth.uid()) is not null);

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Posts: all signed-in members can read and write their own posts. NOTICE requires ADMIN.
create policy "posts_select_authenticated"
  on public.posts for select to authenticated
  using ((select auth.uid()) is not null);

create policy "posts_insert_own"
  on public.posts for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (category <> 'NOTICE' or (select private.is_admin()))
  );

create policy "posts_update_own"
  on public.posts for update to authenticated
  using (author_id = (select auth.uid()))
  with check (
    author_id = (select auth.uid())
    and (category <> 'NOTICE' or (select private.is_admin()))
  );

create policy "posts_delete_own"
  on public.posts for delete to authenticated
  using (author_id = (select auth.uid()));

-- Comments: only the author can change or remove a comment.
create policy "comments_select_authenticated"
  on public.comments for select to authenticated
  using ((select auth.uid()) is not null);

create policy "comments_insert_own"
  on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()));

create policy "comments_update_own"
  on public.comments for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy "comments_delete_own"
  on public.comments for delete to authenticated
  using (author_id = (select auth.uid()));

-- Likes: a member may create and remove only their own like.
create policy "post_likes_select_authenticated"
  on public.post_likes for select to authenticated
  using ((select auth.uid()) is not null);

create policy "post_likes_insert_own"
  on public.post_likes for insert to authenticated
  with check (profile_id = (select auth.uid()));

create policy "post_likes_delete_own"
  on public.post_likes for delete to authenticated
  using (profile_id = (select auth.uid()));

-- Recruitments: only the author can update or delete their recruitment post.
create policy "recruitments_select_authenticated"
  on public.recruitments for select to authenticated
  using ((select auth.uid()) is not null);

create policy "recruitments_insert_own"
  on public.recruitments for insert to authenticated
  with check (author_id = (select auth.uid()));

create policy "recruitments_update_own"
  on public.recruitments for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy "recruitments_delete_own"
  on public.recruitments for delete to authenticated
  using (author_id = (select auth.uid()));

-- Recruitment members: joining is allowed only while the recruitment is OPEN.
create policy "recruitment_members_select_authenticated"
  on public.recruitment_members for select to authenticated
  using ((select auth.uid()) is not null);

create policy "recruitment_members_insert_own_open_recruitment"
  on public.recruitment_members for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1
      from public.recruitments
      where id = recruitment_id
        and status = 'OPEN'
    )
  );

create policy "recruitment_members_delete_own"
  on public.recruitment_members for delete to authenticated
  using (profile_id = (select auth.uid()));

-- Jobs: any signed-in member can register a job, but only its author can change it.
create policy "jobs_select_authenticated"
  on public.jobs for select to authenticated
  using ((select auth.uid()) is not null);

create policy "jobs_insert_own"
  on public.jobs for insert to authenticated
  with check (author_id = (select auth.uid()));

create policy "jobs_update_own"
  on public.jobs for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy "jobs_delete_own"
  on public.jobs for delete to authenticated
  using (author_id = (select auth.uid()));

-- Functions in private are not exposed through the Data API.
revoke all on function private.set_updated_at() from public;
revoke all on function private.is_admin() from public;
revoke all on function private.create_profile_for_new_user() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

-- Promote the first administrator manually in the Supabase SQL Editor after signup:
-- update public.profiles set role = 'ADMIN' where email = 'admin@example.com';
