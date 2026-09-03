-- 최대 모집 인원이 있는 모집글은 인원 초과 참여를 DB 정책에서도 막습니다.
create or replace function private.can_join_recruitment(target_recruitment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_recruitment public.recruitments%rowtype;
begin
  select *
  into target_recruitment
  from public.recruitments
  where id = target_recruitment_id
  for update;

  if not found
    or target_recruitment.status <> 'OPEN'
    or (
      target_recruitment.deadline is not null
      and target_recruitment.deadline < current_date
    ) then
    return false;
  end if;

  if target_recruitment.max_members is null then
    return true;
  end if;

  return (
    select count(*) < target_recruitment.max_members
    from public.recruitment_members
    where recruitment_id = target_recruitment_id
  );
end;
$$;

revoke all on function private.can_join_recruitment(uuid) from public;
grant execute on function private.can_join_recruitment(uuid) to authenticated;

drop policy if exists "recruitment_members_insert_own_open" on public.recruitment_members;

create policy "recruitment_members_insert_own_open"
on public.recruitment_members for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and (select private.can_join_recruitment(recruitment_id))
);
