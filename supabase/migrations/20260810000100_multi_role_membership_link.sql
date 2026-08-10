-- Multi-role membership linking fix
-- Fixes: TIC/School Head who is also a Teacher gets user_id=NULL in
-- school_assignments because the RPC only matched profiles with role='teacher'.
-- Now also matches role='school_head' so TICs are properly linked.

-- Part A: Re-create the RPC with the widened role filter.
-- The ONLY change is line ~353-356: role.role = 'teacher' → role.role in ('teacher', 'school_head')
create or replace function public.upsert_principal_teacher_membership(
  p_assignment_id uuid,
  p_teacher_name text,
  p_teacher_email text,
  p_grade_level text,
  p_section text,
  p_profile_image_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_principal_id uuid := auth.uid();
  v_email text := lower(btrim(coalesce(p_teacher_email, '')));
  v_name text := nullif(btrim(coalesce(p_teacher_name, '')), '');
  v_principal_profile public.profiles%rowtype;
  v_teacher_profile public.profiles%rowtype;
  v_existing public.school_assignments%rowtype;
  v_target public.school_assignments%rowtype;
  v_school public.schools%rowtype;
  v_created boolean := false;
begin
  if v_principal_id is null then
    raise exception 'Not authenticated.' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.user_roles
    where user_id = v_principal_id and role = 'school_head'
  ) then
    raise exception 'Only a School Head can manage teacher memberships.'
      using errcode = '42501';
  end if;

  if v_email = '' or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid DepEd email address.' using errcode = '22023';
  end if;

  if v_name is null or nullif(btrim(coalesce(p_grade_level, '')), '') is null then
    raise exception 'Teacher name and grade classification are required.'
      using errcode = '22023';
  end if;

  select * into v_principal_profile
  from public.profiles
  where user_id = v_principal_id;

  if v_principal_profile.user_id is null
     or nullif(btrim(v_principal_profile.school), '') is null
     or nullif(btrim(v_principal_profile.district_name), '') is null then
    raise exception 'Complete the Principal School and District information first.'
      using errcode = '23514';
  end if;

  -- KEY CHANGE: accept both 'teacher' and 'school_head' roles.
  -- A TIC who is both a teacher and a school head must be linkable.
  select profile.* into v_teacher_profile
  from public.profiles profile
  where lower(btrim(profile.email)) = v_email
    and exists (
      select 1 from public.user_roles role
      where role.user_id = profile.user_id and role.role in ('teacher', 'school_head')
    )
  order by profile.updated_at desc nulls last
  limit 1;

  if v_teacher_profile.user_id is not null then
    v_email := lower(btrim(v_teacher_profile.email));
    v_name := coalesce(nullif(btrim(v_teacher_profile.teacher_name), ''), v_name);
  end if;

  select * into v_school
  from public.schools school
  where school.principal_id = v_principal_id
     or lower(btrim(school.school_name)) = lower(btrim(v_principal_profile.school))
  order by (school.principal_id = v_principal_id) desc, school.updated_at desc nulls last
  limit 1;

  if p_assignment_id is not null then
    select * into v_existing
    from public.school_assignments
    where id = p_assignment_id
      and principal_id = v_principal_id
      and is_active
    for update;

    if v_existing.id is null then
      raise exception 'Teacher record not found or already removed.'
        using errcode = 'P0002';
    end if;
  end if;

  select * into v_target
  from public.school_assignments assignment
  where assignment.principal_id = v_principal_id
    and assignment.normalized_teacher_email = v_email
    and assignment.normalized_school_name =
      regexp_replace(lower(btrim(v_principal_profile.school)), '\s+', ' ', 'g')
    and assignment.is_active
  order by assignment.created_at asc
  limit 1
  for update;

  if v_existing.id is not null and v_target.id is not null and v_existing.id <> v_target.id then
    update public.school_assignments
    set is_active = false,
        deleted_at = now(),
        deleted_by = v_principal_id
    where id = v_existing.id;
  end if;

  if v_target.id is null and v_existing.id is not null then
    v_target := v_existing;
  end if;

  if v_target.id is null then
    insert into public.school_assignments (
      user_id,
      school_name,
      district_name,
      principal_id,
      principal_name,
      principal_profile_image_url,
      supervisor_id,
      teacher_name,
      teacher_email,
      grade_level,
      section,
      profile_image_url,
      is_active,
      deleted_at,
      deleted_by
    )
    values (
      v_teacher_profile.user_id,
      btrim(v_principal_profile.school),
      btrim(v_principal_profile.district_name),
      v_principal_id,
      v_principal_profile.teacher_name,
      v_principal_profile.profile_image_url,
      v_school.supervisor_id,
      v_name,
      v_email,
      btrim(p_grade_level),
      nullif(btrim(coalesce(p_section, '')), ''),
      coalesce(v_teacher_profile.profile_image_url, p_profile_image_url),
      true,
      null,
      null
    )
    returning * into v_target;
    v_created := true;
  else
    update public.school_assignments
    set user_id = coalesce(v_teacher_profile.user_id, v_target.user_id),
        school_name = btrim(v_principal_profile.school),
        district_name = btrim(v_principal_profile.district_name),
        principal_name = v_principal_profile.teacher_name,
        principal_profile_image_url = v_principal_profile.profile_image_url,
        supervisor_id = coalesce(v_school.supervisor_id, v_target.supervisor_id),
        teacher_name = v_name,
        teacher_email = v_email,
        grade_level = btrim(p_grade_level),
        section = nullif(btrim(coalesce(p_section, '')), ''),
        profile_image_url = coalesce(v_teacher_profile.profile_image_url, p_profile_image_url, v_target.profile_image_url),
        is_active = true,
        deleted_at = null,
        deleted_by = null
    where id = v_target.id
    returning * into v_target;
  end if;

  if v_school.id is not null then
    insert into public.teacher_school_memberships (
      teacher_id,
      teacher_email,
      school_id,
      principal_id,
      district_id,
      status,
      grade_level,
      section,
      subjects,
      approved_at
    )
    values (
      v_teacher_profile.user_id,
      v_email,
      v_school.id,
      v_principal_id,
      v_school.district_id,
      case
        when v_teacher_profile.user_id is null then 'invited'::public.membership_status
        else 'active'::public.membership_status
      end,
      btrim(p_grade_level),
      nullif(btrim(coalesce(p_section, '')), ''),
      null,
      case
        when v_teacher_profile.user_id is not null then now()
        else null
      end
    )
    on conflict (lower(btrim(teacher_email)), school_id) do update
      set teacher_id = excluded.teacher_id,
          principal_id = excluded.principal_id,
          district_id = excluded.district_id,
          status = excluded.status,
          grade_level = excluded.grade_level,
          section = excluded.section,
          approved_at = excluded.approved_at;
  end if;

  return jsonb_build_object(
    'success', true,
    'created', v_created,
    'assignment_id', v_target.id,
    'teacher_name', v_target.teacher_name,
    'teacher_email', v_target.teacher_email,
    'school_name', v_target.school_name,
    'user_id_linked', v_target.user_id is not null
  );
end;
$$;

-- Part B: Backfill school_assignments where user_id is NULL but the teacher_email
-- matches a profile that has school_head role (TIC who was added as teacher but
-- wasn't linked because the old RPC only matched role='teacher').
update public.school_assignments sa
set user_id = p.user_id
from public.profiles p
where sa.user_id is null
  and sa.normalized_teacher_email is not null
  and sa.normalized_teacher_email <> ''
  and lower(btrim(p.email)) = sa.normalized_teacher_email
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = p.user_id and ur.role in ('teacher', 'school_head')
  );
