-- 모집 종료는 OPEN에서 CLOSED로만 변경할 수 있게 한다.
-- 작성자만 update할 수 있는 기존 RLS 정책은 그대로 유지한다.
create or replace function private.prevent_recruitment_reopen()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'CLOSED' and new.status <> 'CLOSED' then
    raise exception '모집 종료된 글은 다시 열 수 없습니다.';
  end if;

  return new;
end;
$$;

revoke all on function private.prevent_recruitment_reopen() from public;

drop trigger if exists prevent_recruitment_reopen on public.recruitments;

create trigger prevent_recruitment_reopen
before update on public.recruitments
for each row
execute function private.prevent_recruitment_reopen();
