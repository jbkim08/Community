-- 앱 UI에서 제공하지 않는 훈련과정 변경을 DB에서도 막는다.
-- role은 기존에도 UPDATE 권한이 없었지만, 명시적으로 다시 제거한다.

revoke update (
  role,
  training_course,
  training_started_at,
  training_ended_at,
  training_course_id
)
on table public.profiles
from authenticated;

-- 기타 과정 회원은 자신이 입력한 과정 정보만 계속 수정할 수 있다.
grant update (
  name,
  avatar_url,
  bio,
  github_url,
  portfolio_url,
  custom_training_course,
  custom_training_started_at,
  custom_training_ended_at
)
on table public.profiles
to authenticated;

-- 관리자가 등록한 과정을 선택한 회원은 custom 값도 직접 바꿀 수 없다.
-- 일반 과정 변경 기능은 별도 Task에서 명시적으로 추가한다.
create or replace function private.prevent_managed_training_course_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.training_course_id is not null
    and (
      new.training_course_id is distinct from old.training_course_id
      or new.custom_training_course is distinct from old.custom_training_course
      or new.custom_training_started_at is distinct from old.custom_training_started_at
      or new.custom_training_ended_at is distinct from old.custom_training_ended_at
    ) then
    raise exception '관리자 등록 훈련과정은 직접 변경할 수 없습니다.';
  end if;

  return new;
end;
$$;

revoke all on function private.prevent_managed_training_course_changes() from public;

drop trigger if exists prevent_managed_training_course_changes on public.profiles;

create trigger prevent_managed_training_course_changes
before update on public.profiles
for each row
execute function private.prevent_managed_training_course_changes();
