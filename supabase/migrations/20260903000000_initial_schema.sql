-- =========================================================
-- Student Community
-- Next.js + Supabase 기반 학생 커뮤니티 초기 DB 스키마
--
-- 주요 기능
-- 1. 회원 프로필
-- 2. 게시판
-- 3. 댓글
-- 4. 좋아요
-- 5. 프로젝트 / 스터디 모집
-- 6. 모집 참여
-- 7. 취업정보
-- 8. 게시글 이미지 Storage
-- 9. RLS 보안 정책
--
-- Supabase SQL Editor 또는 migration에서 실행
-- =========================================================


-- =========================================================
-- 1. 기본 Extension 및 private schema
-- =========================================================

-- UUID 생성을 위해 pgcrypto extension 사용
create extension if not exists pgcrypto with schema extensions;


-- 내부 함수들을 저장할 private schema 생성
create schema if not exists private;


-- 일반 사용자가 private schema를 직접 접근하지 못하도록 제한
revoke all on schema private from public;



-- =========================================================
-- 2. updated_at 자동 변경 함수
-- =========================================================

-- UPDATE가 발생할 때 updated_at을 현재 시간으로 변경
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;



-- =========================================================
-- 3. 회원 프로필
-- =========================================================

create table public.profiles (

  -- Supabase Auth 사용자 ID와 동일한 UUID 사용
  id uuid primary key,

  -- 회원 이름
  name text not null,

  -- 프로필 이미지 URL 또는 Storage 경로
  avatar_url text,

  -- 자기소개
  bio text,

  -- GitHub 주소
  github_url text,

  -- 포트폴리오 주소
  portfolio_url text,

  -- 훈련과정명
  training_course text,

  -- 훈련 시작일
  training_started_at date,

  -- 훈련 종료일
  training_ended_at date,

  -- 회원 권한
  role text not null default 'MEMBER',

  -- 생성일
  created_at timestamptz not null default now(),

  -- 수정일
  updated_at timestamptz not null default now(),


  -- Auth 사용자와 1:1 관계
  constraint profiles_id_fkey
    foreign key (id)
    references auth.users(id)
    on delete cascade,


  -- 이름은 1자 이상 50자 이하
  constraint profiles_name_length_check
    check (
      char_length(btrim(name)) between 1 and 50
    ),


  -- 자기소개는 최대 500자
  constraint profiles_bio_length_check
    check (
      bio is null
      or char_length(bio) <= 500
    ),


  -- GitHub 주소가 존재하면 http 또는 https로 시작해야 함
  constraint profiles_github_url_check
    check (
      github_url is null
      or github_url ~* '^https?://'
    ),


  -- 포트폴리오 주소가 존재하면 http 또는 https로 시작해야 함
  constraint profiles_portfolio_url_check
    check (
      portfolio_url is null
      or portfolio_url ~* '^https?://'
    ),


  -- 훈련 시작일은 종료일보다 늦을 수 없음
  constraint profiles_training_dates_check
    check (
      training_started_at is null
      or training_ended_at is null
      or training_started_at <= training_ended_at
    ),


  -- 권한은 ADMIN 또는 MEMBER
  constraint profiles_role_check
    check (
      role in ('ADMIN', 'MEMBER')
    )
);



-- =========================================================
-- 4. 관리자 확인 함수
-- =========================================================

-- RLS 정책 내부에서 현재 사용자가 관리자인지 확인
--
-- SECURITY DEFINER를 사용하여
-- profiles RLS를 다시 호출하면서 발생할 수 있는 재귀 문제 방지
create or replace function private.is_admin()
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



-- =========================================================
-- 5. 게시글
-- =========================================================

create table public.posts (

  -- 게시글 ID
  id uuid primary key
    default extensions.gen_random_uuid(),

  -- 작성자
  author_id uuid not null,

  -- 게시글 카테고리
  category text not null default 'FREE',

  -- 제목
  title text not null,

  -- 내용
  content text not null,

  -- Supabase Storage의 이미지 파일 경로
  --
  -- 예:
  -- 사용자UUID/550e8400.webp
  --
  -- 전체 URL을 저장하지 않고 파일 경로만 저장
  image_path text,

  -- 작성일
  created_at timestamptz not null default now(),

  -- 수정일
  updated_at timestamptz not null default now(),


  -- 작성자는 profiles 회원이어야 함
  --
  -- Supabase nested select에서
  -- posts -> profiles JOIN 관계로 사용
  constraint posts_author_id_fkey
    foreign key (author_id)
    references public.profiles(id)
    on delete cascade,


  -- 게시판 카테고리
  --
  -- 취업정보는 jobs 테이블을 별도로 사용하므로
  -- JOB 카테고리는 사용하지 않음
  constraint posts_category_check
    check (
      category in (
        'NOTICE',
        'FREE',
        'QUESTION',
        'INFO'
      )
    ),


  -- 제목 1자 이상 200자 이하
  constraint posts_title_length_check
    check (
      char_length(btrim(title))
      between 1 and 200
    ),


  -- 본문 1자 이상 10000자 이하
  constraint posts_content_length_check
    check (
      char_length(btrim(content))
      between 1 and 10000
    ),


  -- 이미지가 존재하면 허용된 이미지 확장자만 사용
  constraint posts_image_path_check
    check (
      image_path is null
      or image_path ~* '\.(jpg|jpeg|png|webp)$'
    )
);



-- =========================================================
-- 6. 댓글
-- =========================================================

create table public.comments (

  -- 댓글 ID
  id uuid primary key
    default extensions.gen_random_uuid(),

  -- 댓글이 속한 게시글
  post_id uuid not null,

  -- 댓글 작성자
  author_id uuid not null,

  -- 댓글 내용
  content text not null,

  -- 작성일
  created_at timestamptz not null default now(),

  -- 수정일
  updated_at timestamptz not null default now(),


  -- 게시글 삭제 시 댓글도 함께 삭제
  constraint comments_post_id_fkey
    foreign key (post_id)
    references public.posts(id)
    on delete cascade,


  -- 작성자와 profiles 연결
  constraint comments_author_id_fkey
    foreign key (author_id)
    references public.profiles(id)
    on delete cascade,


  -- 댓글은 1자 이상 1000자 이하
  constraint comments_content_length_check
    check (
      char_length(btrim(content))
      between 1 and 1000
    )
);



-- =========================================================
-- 7. 게시글 좋아요
-- =========================================================

create table public.post_likes (

  -- 좋아요 ID
  id uuid primary key
    default extensions.gen_random_uuid(),

  -- 게시글 ID
  post_id uuid not null,

  -- 좋아요를 누른 회원
  profile_id uuid not null,

  -- 생성일
  created_at timestamptz not null default now(),


  -- 게시글 삭제 시 좋아요도 삭제
  constraint post_likes_post_id_fkey
    foreign key (post_id)
    references public.posts(id)
    on delete cascade,


  -- 회원 삭제 시 좋아요도 삭제
  constraint post_likes_profile_id_fkey
    foreign key (profile_id)
    references public.profiles(id)
    on delete cascade,


  -- 동일 회원은 한 게시글에 좋아요를 한 번만 가능
  constraint post_likes_post_id_profile_id_key
    unique (post_id, profile_id)
);



-- =========================================================
-- 8. 프로젝트 / 스터디 모집
-- =========================================================

create table public.recruitments (

  -- 모집글 ID
  id uuid primary key
    default extensions.gen_random_uuid(),

  -- 작성자
  author_id uuid not null,

  -- 모집 종류
  type text not null,

  -- 모집 상태
  status text not null default 'OPEN',

  -- 제목
  title text not null,

  -- 모집 내용
  content text not null,

  -- 최대 모집 인원
  --
  -- NULL이면 인원 제한 없음
  max_members integer,

  -- 모집 마감일
  deadline date,

  -- 작성일
  created_at timestamptz not null default now(),

  -- 수정일
  updated_at timestamptz not null default now(),


  -- 모집 작성자와 profiles 연결
  constraint recruitments_author_id_fkey
    foreign key (author_id)
    references public.profiles(id)
    on delete cascade,


  -- 프로젝트 / 스터디 / 기타
  constraint recruitments_type_check
    check (
      type in (
        'PROJECT',
        'STUDY',
        'ETC'
      )
    ),


  -- 모집중 또는 모집종료
  constraint recruitments_status_check
    check (
      status in (
        'OPEN',
        'CLOSED'
      )
    ),


  -- 제목 1자 이상 200자 이하
  constraint recruitments_title_length_check
    check (
      char_length(btrim(title))
      between 1 and 200
    ),


  -- 내용 1자 이상 10000자 이하
  constraint recruitments_content_length_check
    check (
      char_length(btrim(content))
      between 1 and 10000
    ),


  -- 모집 인원이 존재하면 최소 1명 이상
  constraint recruitments_max_members_check
    check (
      max_members is null
      or max_members >= 1
    )
);



-- =========================================================
-- 9. 모집 참여 회원
-- =========================================================

create table public.recruitment_members (

  -- 참여 ID
  id uuid primary key
    default extensions.gen_random_uuid(),

  -- 모집글
  recruitment_id uuid not null,

  -- 참여 회원
  profile_id uuid not null,

  -- 참여일
  created_at timestamptz not null default now(),


  -- 모집글 삭제 시 참여 정보 삭제
  constraint recruitment_members_recruitment_id_fkey
    foreign key (recruitment_id)
    references public.recruitments(id)
    on delete cascade,


  -- 회원 삭제 시 참여 정보 삭제
  constraint recruitment_members_profile_id_fkey
    foreign key (profile_id)
    references public.profiles(id)
    on delete cascade,


  -- 같은 모집글에 중복 참여 금지
  constraint recruitment_members_recruitment_id_profile_id_key
    unique (recruitment_id, profile_id)
);



-- =========================================================
-- 10. 취업정보
-- =========================================================

create table public.jobs (

  -- 취업정보 ID
  id uuid primary key
    default extensions.gen_random_uuid(),

  -- 작성자
  author_id uuid not null,

  -- 회사명
  company_name text not null,

  -- 채용 제목
  title text not null,

  -- 지역
  location text,

  -- 채용 설명
  description text not null,

  -- 실제 채용공고 URL
  application_url text not null,

  -- 채용 마감일
  deadline date,

  -- 작성일
  created_at timestamptz not null default now(),

  -- 수정일
  updated_at timestamptz not null default now(),


  -- 작성자와 profiles 연결
  constraint jobs_author_id_fkey
    foreign key (author_id)
    references public.profiles(id)
    on delete cascade,


  -- 회사명 1자 이상 100자 이하
  constraint jobs_company_name_length_check
    check (
      char_length(btrim(company_name))
      between 1 and 100
    ),


  -- 제목 1자 이상 200자 이하
  constraint jobs_title_length_check
    check (
      char_length(btrim(title))
      between 1 and 200
    ),


  -- 설명 1자 이상 10000자 이하
  constraint jobs_description_length_check
    check (
      char_length(btrim(description))
      between 1 and 10000
    ),


  -- 채용공고 URL 형식 확인
  constraint jobs_application_url_check
    check (
      application_url ~* '^https?://'
    )
);



-- =========================================================
-- 11. Index
-- =========================================================

-- 훈련과정 / 훈련 시작일 검색용
create index idx_profiles_training_course_started_at
  on public.profiles (
    training_course,
    training_started_at
  );


-- 게시글 작성자 검색용
create index idx_posts_author_id
  on public.posts(author_id);


-- 게시판 카테고리 및 최신순 조회용
create index idx_posts_category_created_at
  on public.posts(
    category,
    created_at desc
  );


-- 전체 게시글 최신순 조회용
create index idx_posts_created_at
  on public.posts(created_at desc);


-- 특정 게시글의 댓글 조회용
create index idx_comments_post_id_created_at
  on public.comments(
    post_id,
    created_at
  );


-- 회원별 댓글 조회용
create index idx_comments_author_id
  on public.comments(author_id);


-- 좋아요를 누른 회원 검색용
create index idx_post_likes_profile_id
  on public.post_likes(profile_id);


-- 모집글 작성자 검색용
create index idx_recruitments_author_id
  on public.recruitments(author_id);


-- 모집중 글 최신순 검색용
create index idx_recruitments_status_created_at
  on public.recruitments(
    status,
    created_at desc
  );


-- 모집글 종류 검색용
create index idx_recruitments_type_created_at
  on public.recruitments(
    type,
    created_at desc
  );


-- 회원이 참여한 모집글 검색용
create index idx_recruitment_members_profile_id
  on public.recruitment_members(profile_id);


-- 취업정보 작성자 검색용
create index idx_jobs_author_id
  on public.jobs(author_id);


-- 취업정보 최신순 조회용
create index idx_jobs_created_at
  on public.jobs(created_at desc);


-- 마감일 검색용
create index idx_jobs_deadline
  on public.jobs(deadline);



-- =========================================================
-- 12. 회원가입 시 profiles 자동 생성
-- =========================================================

-- Supabase Auth 회원가입이 완료되면
-- public.profiles에 기본 프로필을 자동 생성
create or replace function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  insert into public.profiles (
    id,
    name
  )
  values (
    new.id,

    -- 회원가입 metadata의 name을 우선 사용
    -- 없으면 이메일 앞부분 사용
    -- 그것도 없으면 '새 회원' 사용
    left(
      coalesce(
        nullif(
          btrim(new.raw_user_meta_data ->> 'name'),
          ''
        ),

        nullif(
          split_part(
            coalesce(new.email, ''),
            '@',
            1
          ),
          ''
        ),

        '새 회원'
      ),
      50
    )
  );

  return new;

end;
$$;


-- 기존 Trigger가 있다면 제거
drop trigger if exists on_auth_user_created
  on auth.users;


-- Auth 회원 생성 직후 profile 생성
create trigger on_auth_user_created
  after insert
  on auth.users

  for each row
  execute function
  private.create_profile_for_new_user();



-- =========================================================
-- 13. updated_at Trigger
-- =========================================================

-- 회원 프로필 수정일 자동 업데이트
create trigger set_profiles_updated_at
  before update
  on public.profiles

  for each row
  execute function
  private.set_updated_at();


-- 게시글 수정일 자동 업데이트
create trigger set_posts_updated_at
  before update
  on public.posts

  for each row
  execute function
  private.set_updated_at();


-- 댓글 수정일 자동 업데이트
create trigger set_comments_updated_at
  before update
  on public.comments

  for each row
  execute function
  private.set_updated_at();


-- 모집글 수정일 자동 업데이트
create trigger set_recruitments_updated_at
  before update
  on public.recruitments

  for each row
  execute function
  private.set_updated_at();


-- 취업정보 수정일 자동 업데이트
create trigger set_jobs_updated_at
  before update
  on public.jobs

  for each row
  execute function
  private.set_updated_at();



-- =========================================================
-- 14. RLS 활성화
-- =========================================================

alter table public.profiles
  enable row level security;

alter table public.posts
  enable row level security;

alter table public.comments
  enable row level security;

alter table public.post_likes
  enable row level security;

alter table public.recruitments
  enable row level security;

alter table public.recruitment_members
  enable row level security;

alter table public.jobs
  enable row level security;



-- =========================================================
-- 15. 기본 Table 권한 제거
-- =========================================================

-- anon 및 authenticated의 기존 권한 초기화
revoke all
  on table public.profiles
  from anon, authenticated;

revoke all
  on table public.posts
  from anon, authenticated;

revoke all
  on table public.comments
  from anon, authenticated;

revoke all
  on table public.post_likes
  from anon, authenticated;

revoke all
  on table public.recruitments
  from anon, authenticated;

revoke all
  on table public.recruitment_members
  from anon, authenticated;

revoke all
  on table public.jobs
  from anon, authenticated;



-- =========================================================
-- 16. 필요한 Table 권한 부여
-- =========================================================

-- 로그인 회원은 회원 프로필 조회 가능
grant select
  on table public.profiles
  to authenticated;


-- 본인이 수정 가능한 프로필 컬럼
--
-- role은 포함하지 않음
-- 일반 회원이 자신을 ADMIN으로 변경하는 것을 방지
grant update (
  name,
  avatar_url,
  bio,
  github_url,
  portfolio_url,
  training_course,
  training_started_at,
  training_ended_at
)
  on table public.profiles
  to authenticated;


-- 게시글 CRUD
grant select, insert, update, delete
  on table public.posts
  to authenticated;


-- 댓글 CRUD
grant select, insert, update, delete
  on table public.comments
  to authenticated;


-- 좋아요
--
-- 수정은 필요하지 않음
grant select, insert, delete
  on table public.post_likes
  to authenticated;


-- 프로젝트 / 스터디 모집 CRUD
grant select, insert, update, delete
  on table public.recruitments
  to authenticated;


-- 모집 참여
grant select, insert, delete
  on table public.recruitment_members
  to authenticated;


-- 취업정보 CRUD
grant select, insert, update, delete
  on table public.jobs
  to authenticated;



-- =========================================================
-- 17. profiles RLS
-- =========================================================

-- 로그인한 회원은 전체 회원 목록 조회 가능
create policy "profiles_select_authenticated"
  on public.profiles

  for select
  to authenticated

  using (
    (select auth.uid()) is not null
  );


-- 회원은 자신의 프로필만 수정 가능
create policy "profiles_update_own"
  on public.profiles

  for update
  to authenticated

  using (
    id = (select auth.uid())
  )

  with check (
    id = (select auth.uid())
  );



-- =========================================================
-- 18. posts RLS
-- =========================================================

-- 로그인 회원은 모든 게시글 조회 가능
create policy "posts_select_authenticated"
  on public.posts

  for select
  to authenticated

  using (
    (select auth.uid()) is not null
  );


-- 게시글은 본인 ID로만 작성 가능
--
-- NOTICE는 ADMIN만 작성 가능
--
-- 이미지가 있다면
-- 자신의 UUID 폴더에 있는 이미지만 등록 가능
create policy "posts_insert_own"
  on public.posts

  for insert
  to authenticated

  with check (

    author_id = (select auth.uid())

    and (
      category <> 'NOTICE'
      or (select private.is_admin())
    )

    and (
      image_path is null

      or split_part(
        image_path,
        '/',
        1
      ) = (select auth.uid())::text
    )

  );


-- 작성자는 자신의 게시글만 수정 가능
--
-- NOTICE는 ADMIN만 수정 가능
create policy "posts_update_own"
  on public.posts

  for update
  to authenticated

  using (
    author_id = (select auth.uid())
  )

  with check (

    author_id = (select auth.uid())

    and (
      category <> 'NOTICE'
      or (select private.is_admin())
    )

    and (
      image_path is null

      or split_part(
        image_path,
        '/',
        1
      ) = (select auth.uid())::text
    )

  );


-- 작성자 또는 관리자는 게시글 삭제 가능
create policy "posts_delete_author_or_admin"
  on public.posts

  for delete
  to authenticated

  using (
    author_id = (select auth.uid())
    or (select private.is_admin())
  );



-- =========================================================
-- 19. comments RLS
-- =========================================================

-- 로그인 회원은 댓글 조회 가능
create policy "comments_select_authenticated"
  on public.comments

  for select
  to authenticated

  using (
    (select auth.uid()) is not null
  );


-- 본인 이름으로만 댓글 작성 가능
create policy "comments_insert_own"
  on public.comments

  for insert
  to authenticated

  with check (
    author_id = (select auth.uid())
  );


-- 자신의 댓글만 수정 가능
create policy "comments_update_own"
  on public.comments

  for update
  to authenticated

  using (
    author_id = (select auth.uid())
  )

  with check (
    author_id = (select auth.uid())
  );


-- 작성자 또는 관리자는 댓글 삭제 가능
create policy "comments_delete_author_or_admin"
  on public.comments

  for delete
  to authenticated

  using (
    author_id = (select auth.uid())
    or (select private.is_admin())
  );



-- =========================================================
-- 20. post_likes RLS
-- =========================================================

-- 로그인 회원은 좋아요 정보 조회 가능
create policy "post_likes_select_authenticated"
  on public.post_likes

  for select
  to authenticated

  using (
    (select auth.uid()) is not null
  );


-- 자신 명의로만 좋아요 등록 가능
create policy "post_likes_insert_own"
  on public.post_likes

  for insert
  to authenticated

  with check (
    profile_id = (select auth.uid())
  );


-- 자신의 좋아요만 취소 가능
create policy "post_likes_delete_own"
  on public.post_likes

  for delete
  to authenticated

  using (
    profile_id = (select auth.uid())
  );



-- =========================================================
-- 21. recruitments RLS
-- =========================================================

-- 로그인 회원은 모집글 조회 가능
create policy "recruitments_select_authenticated"
  on public.recruitments

  for select
  to authenticated

  using (
    (select auth.uid()) is not null
  );


-- 본인 명의로만 모집글 작성 가능
create policy "recruitments_insert_own"
  on public.recruitments

  for insert
  to authenticated

  with check (
    author_id = (select auth.uid())
  );


-- 자신의 모집글만 수정 가능
create policy "recruitments_update_own"
  on public.recruitments

  for update
  to authenticated

  using (
    author_id = (select auth.uid())
  )

  with check (
    author_id = (select auth.uid())
  );


-- 작성자 또는 관리자는 모집글 삭제 가능
create policy "recruitments_delete_author_or_admin"
  on public.recruitments

  for delete
  to authenticated

  using (
    author_id = (select auth.uid())
    or (select private.is_admin())
  );



-- =========================================================
-- 22. recruitment_members RLS
-- =========================================================

-- 로그인 회원은 모집 참여 목록 조회 가능
create policy "recruitment_members_select_authenticated"
  on public.recruitment_members

  for select
  to authenticated

  using (
    (select auth.uid()) is not null
  );


-- 자신의 계정으로만 참여 가능
--
-- 모집 상태가 OPEN이어야 함
-- 마감일이 지나지 않아야 함
create policy "recruitment_members_insert_own_open"
  on public.recruitment_members

  for insert
  to authenticated

  with check (

    profile_id = (select auth.uid())

    and exists (

      select 1
      from public.recruitments r

      where r.id = recruitment_id

        and r.status = 'OPEN'

        and (
          r.deadline is null
          or r.deadline >= current_date
        )

    )

  );


-- 자신의 참여만 취소 가능
create policy "recruitment_members_delete_own"
  on public.recruitment_members

  for delete
  to authenticated

  using (
    profile_id = (select auth.uid())
  );



-- =========================================================
-- 23. jobs RLS
-- =========================================================

-- 로그인 회원은 취업정보 조회 가능
create policy "jobs_select_authenticated"
  on public.jobs

  for select
  to authenticated

  using (
    (select auth.uid()) is not null
  );


-- 본인 명의로 취업정보 등록 가능
create policy "jobs_insert_own"
  on public.jobs

  for insert
  to authenticated

  with check (
    author_id = (select auth.uid())
  );


-- 자신이 등록한 취업정보만 수정 가능
create policy "jobs_update_own"
  on public.jobs

  for update
  to authenticated

  using (
    author_id = (select auth.uid())
  )

  with check (
    author_id = (select auth.uid())
  );


-- 작성자 또는 관리자는 취업정보 삭제 가능
create policy "jobs_delete_author_or_admin"
  on public.jobs

  for delete
  to authenticated

  using (
    author_id = (select auth.uid())
    or (select private.is_admin())
  );



-- =========================================================
-- 24. private 함수 권한 설정
-- =========================================================

-- 기본 PUBLIC 실행 권한 제거
revoke all
  on function private.set_updated_at()
  from public;

revoke all
  on function private.is_admin()
  from public;

revoke all
  on function private.create_profile_for_new_user()
  from public;


-- authenticated 사용자가
-- RLS 내부에서 private.is_admin()을 호출할 수 있도록 허용
grant usage
  on schema private
  to authenticated;


grant execute
  on function private.is_admin()
  to authenticated;



-- =========================================================
-- 25. Supabase Storage Bucket
-- =========================================================

-- 게시글 이미지 저장용 private bucket 생성
--
-- 최대 파일 크기:
-- 5MB = 5 * 1024 * 1024 = 5242880 bytes
--
-- 허용 형식:
-- JPEG
-- PNG
-- WEBP
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'post-images',
  'post-images',
  false,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id)
do update set

  public = excluded.public,

  file_size_limit = excluded.file_size_limit,

  allowed_mime_types = excluded.allowed_mime_types;



-- =========================================================
-- 26. Storage RLS
-- =========================================================

-- 로그인 회원은 게시글 이미지 조회 가능
--
-- private bucket이므로
-- 화면에서 Signed URL을 생성해서 사용
create policy "post_images_select_authenticated"
  on storage.objects

  for select
  to authenticated

  using (
    bucket_id = 'post-images'
  );


-- 자신의 UUID 폴더에만 이미지 업로드 가능
--
-- 권장 경로:
--
-- post-images/
--   사용자UUID/
--     랜덤UUID.webp
create policy "post_images_insert_own_folder"
  on storage.objects

  for insert
  to authenticated

  with check (

    bucket_id = 'post-images'

    and (
      storage.foldername(name)
    )[1] = (select auth.uid())::text

  );


-- 자신의 폴더에 있는 이미지만 수정 가능
create policy "post_images_update_own_folder"
  on storage.objects

  for update
  to authenticated

  using (

    bucket_id = 'post-images'

    and (
      storage.foldername(name)
    )[1] = (select auth.uid())::text

  )

  with check (

    bucket_id = 'post-images'

    and (
      storage.foldername(name)
    )[1] = (select auth.uid())::text

  );


-- 자신의 폴더에 있는 이미지만 삭제 가능
create policy "post_images_delete_own_folder"
  on storage.objects

  for delete
  to authenticated

  using (

    bucket_id = 'post-images'

    and (
      storage.foldername(name)
    )[1] = (select auth.uid())::text

  );



-- =========================================================
-- 27. 최초 관리자 지정
-- =========================================================

-- 회원가입 후 Supabase SQL Editor에서
-- 최초 관리자 계정을 직접 ADMIN으로 변경
--
-- 이메일은 profiles에 저장하지 않으므로
-- auth.users와 JOIN하여 지정
--
-- 실제 사용할 이메일로 변경 후 실행
--
-- 예:
--
-- update public.profiles p
-- set role = 'ADMIN'
-- from auth.users u
-- where p.id = u.id
--   and u.email = 'admin@example.com';



-- =========================================================
-- 28. 작성자 JOIN 사용 예제
-- =========================================================

-- Supabase JS에서는 아래 관계를 이용할 수 있음
--
-- posts.author_id
--        ↓
-- profiles.id
--
-- FK 이름:
--
-- posts_author_id_fkey
--
-- Supabase JavaScript 예:
--
-- const { data, error } = await supabase
--   .from('posts')
--   .select(`
--     id,
--     category,
--     title,
--     content,
--     image_path,
--     created_at,
--     updated_at,
--     author:profiles!posts_author_id_fkey (
--       id,
--       name,
--       avatar_url,
--       training_course
--     )
--   `)
--   .order('created_at', {
--     ascending: false
--   });
--
--
-- 따라서 아래 방식은 사용하지 않는 것을 권장
--
-- 1. posts 전체 조회
-- 2. profiles 다시 조회
-- 3. JavaScript map으로 작성자 연결
--
-- FK 관계를 이용해서 한 번의 Supabase 요청으로 조회