-- Repair legacy school-head accounts without allowing arbitrary users to
-- promote themselves through the Principal sign-in page.
create or replace function public.repair_current_principal_account()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  current_metadata jsonb;
  matched_school_id uuid;
  matched_school_name text;
  matched_district_name text;
  resolved_principal_name text;
  is_verified_principal boolean := false;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  select
    lower(auth_user.email),
    coalesce(auth_user.raw_user_meta_data, '{}'::jsonb)
  into current_email, current_metadata
  from auth.users auth_user
  where auth_user.id = current_user_id;

  if current_email is null then
    raise exception 'The authenticated account could not be found.' using errcode = '28000';
  end if;

  select
    school.id,
    school.school_name,
    school.district_name
  into
    matched_school_id,
    matched_school_name,
    matched_district_name
  from public.schools school
  where
    school.principal_id = current_user_id
    or lower(coalesce(school.principal_email, '')) = current_email
  order by
    case when school.principal_id = current_user_id then 0 else 1 end,
    school.created_at
  limit 1;

  select
    exists (
      select 1
      from public.user_roles role
      where role.user_id = current_user_id
        and role.role = 'school_head'::public.app_role
    )
    or lower(coalesce(current_metadata->>'role', '')) = 'school_head'
    or matched_school_id is not null
  into is_verified_principal;

  if not is_verified_principal then
    raise exception 'This account is not registered as a school head.' using errcode = '42501';
  end if;

  resolved_principal_name := coalesce(
    nullif(trim(current_metadata->>'full_name'), ''),
    split_part(current_email, '@', 1),
    'School Head'
  );

  insert into public.profiles (
    user_id,
    email,
    teacher_name,
    school,
    district_name
  )
  values (
    current_user_id,
    current_email,
    resolved_principal_name,
    coalesce(
      nullif(trim(matched_school_name), ''),
      nullif(trim(current_metadata->>'school'), ''),
      'Please update'
    ),
    coalesce(
      nullif(trim(matched_district_name), ''),
      nullif(trim(current_metadata->>'district_name'), ''),
      'Please update'
    )
  )
  on conflict (user_id) do update set
    email = excluded.email,
    teacher_name = case
      when nullif(trim(public.profiles.teacher_name), '') is null
        then excluded.teacher_name
      else public.profiles.teacher_name
    end,
    school = case
      when matched_school_id is not null
        and lower(coalesce(public.profiles.school, '')) in (
          '',
          'unknown school',
          'please update',
          'not provided'
        )
        then excluded.school
      else public.profiles.school
    end,
    district_name = case
      when matched_school_id is not null
        and lower(coalesce(public.profiles.district_name, '')) in (
          '',
          'unknown district',
          'please update',
          'not provided'
        )
        then excluded.district_name
      else public.profiles.district_name
    end,
    updated_at = now();

  insert into public.user_roles (user_id, role)
  values (current_user_id, 'school_head'::public.app_role)
  on conflict (user_id, role) do nothing;

  delete from public.user_roles
  where user_id = current_user_id
    and role <> 'school_head'::public.app_role;

  if matched_school_id is not null then
    update public.schools
    set
      principal_id = current_user_id,
      principal_name = resolved_principal_name,
      principal_email = current_email,
      updated_at = now()
    where id = matched_school_id
      and (principal_id is null or principal_id = current_user_id);
  end if;

  return jsonb_build_object(
    'repaired', true,
    'school_name', matched_school_name,
    'district_name', matched_district_name
  );
end;
$$;

revoke all on function public.repair_current_principal_account() from public;
revoke all on function public.repair_current_principal_account() from anon;
grant execute on function public.repair_current_principal_account() to authenticated;

-- Backfill verified legacy Principal accounts. Candidates must either carry the
-- original school_head signup metadata or match an official school record.
with principal_candidates as (
  select
    auth_user.id as user_id,
    lower(auth_user.email) as email,
    coalesce(auth_user.raw_user_meta_data, '{}'::jsonb) as metadata,
    school.school_name,
    school.district_name
  from auth.users auth_user
  left join lateral (
    select school_record.school_name, school_record.district_name
    from public.schools school_record
    where
      school_record.principal_id = auth_user.id
      or lower(coalesce(school_record.principal_email, '')) = lower(auth_user.email)
    order by
      case when school_record.principal_id = auth_user.id then 0 else 1 end,
      school_record.created_at
    limit 1
  ) school on true
  where
    lower(coalesce(auth_user.raw_user_meta_data->>'role', '')) = 'school_head'
    or school.school_name is not null
)
insert into public.profiles (
  user_id,
  email,
  teacher_name,
  school,
  district_name
)
select
  candidate.user_id,
  candidate.email,
  coalesce(
    nullif(trim(candidate.metadata->>'full_name'), ''),
    split_part(candidate.email, '@', 1),
    'School Head'
  ),
  coalesce(
    nullif(trim(candidate.school_name), ''),
    nullif(trim(candidate.metadata->>'school'), ''),
    'Please update'
  ),
  coalesce(
    nullif(trim(candidate.district_name), ''),
    nullif(trim(candidate.metadata->>'district_name'), ''),
    'Please update'
  )
from principal_candidates candidate
on conflict (user_id) do update set
  email = excluded.email,
  teacher_name = case
    when nullif(trim(public.profiles.teacher_name), '') is null
      then excluded.teacher_name
    else public.profiles.teacher_name
  end,
  school = case
    when lower(coalesce(public.profiles.school, '')) in (
      '',
      'unknown school',
      'please update',
      'not provided'
    )
      then excluded.school
    else public.profiles.school
  end,
  district_name = case
    when lower(coalesce(public.profiles.district_name, '')) in (
      '',
      'unknown district',
      'please update',
      'not provided'
    )
      then excluded.district_name
    else public.profiles.district_name
  end,
  updated_at = now();

with principal_candidates as (
  select auth_user.id as user_id
  from auth.users auth_user
  where
    lower(coalesce(auth_user.raw_user_meta_data->>'role', '')) = 'school_head'
    or exists (
      select 1
      from public.schools school
      where
        school.principal_id = auth_user.id
        or lower(coalesce(school.principal_email, '')) = lower(auth_user.email)
    )
)
insert into public.user_roles (user_id, role)
select candidate.user_id, 'school_head'::public.app_role
from principal_candidates candidate
on conflict (user_id, role) do nothing;

delete from public.user_roles role
where role.role <> 'school_head'::public.app_role
  and exists (
    select 1
    from auth.users auth_user
    where auth_user.id = role.user_id
      and (
        lower(coalesce(auth_user.raw_user_meta_data->>'role', '')) = 'school_head'
        or exists (
          select 1
          from public.schools school
          where
            school.principal_id = auth_user.id
            or lower(coalesce(school.principal_email, '')) = lower(auth_user.email)
        )
      )
  );

update public.schools school
set
  principal_id = auth_user.id,
  principal_name = coalesce(
    nullif(trim(auth_user.raw_user_meta_data->>'full_name'), ''),
    school.principal_name,
    split_part(auth_user.email, '@', 1)
  ),
  principal_email = lower(auth_user.email),
  updated_at = now()
from auth.users auth_user
where
  lower(coalesce(school.principal_email, '')) = lower(auth_user.email)
  and (school.principal_id is null or school.principal_id = auth_user.id);
