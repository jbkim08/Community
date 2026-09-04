-- 관리자가 등록하는 훈련과정과 회원 프로필의 과정 참조를 추가한다.
-- 기존 training_course 관련 컬럼은 호환성을 위해 유지한다.

create table public.training_courses (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  started_at date not null,
  ended_at date not null,
  signup_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint training_courses_name_length_check
    check (char_length(btrim(name)) between 1 and 200),

  constraint training_courses_dates_check
    check (started_at <= ended_at),

  constraint training_courses_unique
    unique (name, started_at, ended_at)
);

alter table public.profiles
  add column if not exists training_course_id uuid,
  add column if not exists custom_training_course text,
  add column if not exists custom_training_started_at date,
  add column if not exists custom_training_ended_at date;

alter table public.profiles
  add constraint profiles_training_course_id_fkey
  foreign key (training_course_id)
  references public.training_courses(id)
  on delete restrict;

alter table public.profiles
  add constraint profiles_custom_training_dates_check
  check (
    custom_training_started_at is null
    or custom_training_ended_at is null
    or custom_training_started_at <= custom_training_ended_at
  );

create index idx_profiles_training_course_id
  on public.profiles(training_course_id);

create index idx_training_courses_signup_enabled
  on public.training_courses(signup_enabled)
  where signup_enabled = true;

-- 날짜까지 갖춘 기존 과정만 새 테이블에 옮긴다.
-- 날짜가 불완전한 기존 프로필은 기존 컬럼을 그대로 유지한다.
insert into public.training_courses (name, started_at, ended_at)
select distinct
  btrim(training_course),
  training_started_at,
  training_ended_at
from public.profiles
where nullif(btrim(training_course), '') is not null
  and training_started_at is not null
  and training_ended_at is not null
on conflict (name, started_at, ended_at) do nothing;

-- 기존 프로필을 새로 생성하거나 이미 존재하는 과정에 연결한다.
update public.profiles profile
set training_course_id = training_course.id
from public.training_courses training_course
where profile.training_course_id is null
  and nullif(btrim(profile.training_course), '') = training_course.name
  and profile.training_started_at = training_course.started_at
  and profile.training_ended_at = training_course.ended_at;

create trigger set_training_courses_updated_at
before update on public.training_courses
for each row
execute function private.set_updated_at();

alter table public.training_courses enable row level security;

revoke all on table public.training_courses from anon, authenticated;

grant select on table public.training_courses to anon, authenticated;
grant insert, update on table public.training_courses to authenticated;

-- 다음 Task의 회원가입/프로필 화면에서 본인 과정 정보를 저장할 수 있게 한다.
grant update (
  training_course_id,
  custom_training_course,
  custom_training_started_at,
  custom_training_ended_at
)
on table public.profiles
to authenticated;

create policy "training_courses_select_signup_enabled_anon"
on public.training_courses
for select
to anon
using (signup_enabled = true);

create policy "training_courses_select_authenticated"
on public.training_courses
for select
to authenticated
using ((select auth.uid()) is not null);

create policy "training_courses_insert_admin"
on public.training_courses
for insert
to authenticated
with check ((select private.is_admin()));

create policy "training_courses_update_admin"
on public.training_courses
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

-- authenticated에는 DELETE 권한과 DELETE 정책을 부여하지 않는다.
