-- 회원가입 metadata의 훈련과정 정보를 검증한 뒤 profiles에 저장한다.
-- 이 migration은 20260904000000_add_training_courses.sql 적용 이후 실행한다.

create or replace function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata_training_course_id text := nullif(
    btrim(new.raw_user_meta_data ->> 'training_course_id'),
    ''
  );
  selected_training_course_id uuid;
  custom_course text;
  custom_started_at date;
  custom_ended_at date;
begin
  if metadata_training_course_id is not null then
    begin
      selected_training_course_id := metadata_training_course_id::uuid;
    exception
      when invalid_text_representation then
        raise exception '선택한 훈련과정이 올바르지 않습니다.';
    end;

    if not exists (
      select 1
      from public.training_courses
      where id = selected_training_course_id
        and signup_enabled = true
    ) then
      raise exception '선택한 훈련과정을 사용할 수 없습니다.';
    end if;
  else
    custom_course := nullif(
      btrim(new.raw_user_meta_data ->> 'custom_training_course'),
      ''
    );

    if custom_course is null then
      raise exception '훈련과정을 선택해야 합니다.';
    end if;

    if char_length(custom_course) > 200 then
      raise exception '기타 훈련과정명은 200자 이하이어야 합니다.';
    end if;

    begin
      custom_started_at := nullif(
        btrim(new.raw_user_meta_data ->> 'custom_training_started_at'),
        ''
      )::date;
      custom_ended_at := nullif(
        btrim(new.raw_user_meta_data ->> 'custom_training_ended_at'),
        ''
      )::date;
    exception
      when invalid_datetime_format or datetime_field_overflow then
        raise exception '기타 훈련과정 날짜가 올바르지 않습니다.';
    end;

    if custom_started_at is not null
      and custom_ended_at is not null
      and custom_started_at > custom_ended_at then
      raise exception '훈련 시작일은 종료일보다 늦을 수 없습니다.';
    end if;
  end if;

  insert into public.profiles (
    id,
    name,
    training_course_id,
    custom_training_course,
    custom_training_started_at,
    custom_training_ended_at
  )
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        '새 회원'
      ),
      50
    ),
    selected_training_course_id,
    case when selected_training_course_id is null then custom_course else null end,
    case when selected_training_course_id is null then custom_started_at else null end,
    case when selected_training_course_id is null then custom_ended_at else null end
  );

  return new;
end;
$$;

revoke all on function private.create_profile_for_new_user() from public;
