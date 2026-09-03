-- 모집글 작성자는 모임장으로 자동 참여합니다.
-- AFTER INSERT trigger는 모집글 INSERT와 같은 트랜잭션에서 실행되므로
-- 모임장 참여 등록이 실패하면 모집글 생성도 함께 롤백됩니다.
create or replace function private.add_recruitment_author_as_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.recruitment_members (recruitment_id, profile_id)
  values (new.id, new.author_id);

  return new;
end;
$$;

revoke all on function private.add_recruitment_author_as_member() from public;

drop trigger if exists add_recruitment_author_as_member on public.recruitments;

create trigger add_recruitment_author_as_member
  after insert on public.recruitments
  for each row
  execute function private.add_recruitment_author_as_member();

-- 기존 모집글에도 작성자를 모임장으로 등록합니다.
insert into public.recruitment_members (recruitment_id, profile_id)
select id, author_id
from public.recruitments
on conflict (recruitment_id, profile_id) do nothing;

-- 모임장은 자신의 참여를 취소할 수 없습니다.
drop policy if exists "recruitment_members_delete_own" on public.recruitment_members;

create policy "recruitment_members_delete_own"
on public.recruitment_members for delete
to authenticated
using (
  profile_id = (select auth.uid())
  and not exists (
    select 1
    from public.recruitments
    where id = recruitment_id
      and author_id = profile_id
  )
);
