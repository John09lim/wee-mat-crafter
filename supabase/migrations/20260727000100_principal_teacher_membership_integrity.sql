-- Make the principal's teacher list a membership list instead of a collection
-- of loosely related profile fragments.

alter table public.school_assignments
  add column if not exists is_active boolean not null default true,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id);

-- The original table treated a user-school pair as the assignment identity.
-- That prevents us from repairing several legacy rows to the same real user
-- before those rows are collapsed into one membership.
alter table public.school_assignments
  drop constraint if exists school_assignments_user_id_school_name_key;

alter table public.school_assignments
  add column if not exists normalized_teacher_email text
    generated always as (lower(btrim(coalesce(teacher_email, '')))) stored,
  add column if not exists normalized_school_name text
    generated always as (
      regexp_replace(lower(btrim(coalesce(school_name, ''))), '\s+', ' ', 'g')
    ) stored;

-- Some legacy school rows retain a supervisor id whose Auth account no longer
-- exists. The reporting-chain trigger used to copy that stale id into every
-- assignment and make otherwise valid teacher edits fail the foreign key.
create or replace function public.sync_assignment_reporting_chain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_school public.schools%rowtype;
begin
  select * into matched_school
  from public.schools school
  where lower(trim(school.school_name)) = lower(trim(new.school_name))
  order by school.updated_at desc nulls last
  limit 1;

  if new.supervisor_id is not null
     and not exists (select 1 from auth.users where id = new.supervisor_id) then
    new.supervisor_id := null;
  end if;

  if matched_school.id is not null then
    new.district_name := matched_school.district_name;
    if new.supervisor_id is null
       and matched_school.supervisor_id is not null
       and exists (
         select 1 from auth.users where id = matched_school.supervisor_id
       ) then
      new.supervisor_id := matched_school.supervisor_id;
    end if;
    new.principal_id := coalesce(new.principal_id, matched_school.principal_id);
  end if;
  return new;
end;
$$;

-- All future writes use one canonical email representation.
update public.school_assignments
set teacher_email = lower(btrim(teacher_email))
where teacher_email is distinct from lower(btrim(teacher_email));

-- A Principal's current profile is authoritative for the school relationship.
-- This folds older "Unknown School" records into the same school membership
-- before duplicate rows are ranked and collapsed.
update public.school_assignments assignment
set school_name = btrim(principal.school),
    district_name = btrim(principal.district_name),
    principal_name = coalesce(
      nullif(btrim(principal.teacher_name), ''),
      assignment.principal_name
    ),
    principal_profile_image_url = coalesce(
      principal.profile_image_url,
      assignment.principal_profile_image_url
    )
from public.profiles principal
where principal.user_id = assignment.principal_id
  and nullif(btrim(principal.school), '') is not null
  and lower(btrim(principal.school)) <> 'unknown school'
  and nullif(btrim(principal.district_name), '') is not null
  and lower(btrim(principal.district_name)) <> 'unknown district';

-- A linked profile is authoritative for the account link and email, but not
-- blindly for the visible teacher name. Some legacy profiles themselves carry
-- another teacher's name; the oldest already-linked assignment is safer.
update public.school_assignments assignment
set user_id = profile.user_id,
    teacher_email = lower(btrim(profile.email)),
    profile_image_url = coalesce(profile.profile_image_url, assignment.profile_image_url)
from public.profiles profile
where lower(btrim(profile.email)) = assignment.normalized_teacher_email
  and exists (
    select 1
    from public.user_roles role
    where role.user_id = profile.user_id
      and role.role = 'teacher'
  );

update public.school_assignments assignment
set teacher_email = lower(btrim(profile.email)),
    profile_image_url = coalesce(profile.profile_image_url, assignment.profile_image_url)
from public.profiles profile
where assignment.user_id = profile.user_id;

-- Collapse legacy subject-teacher rows and exact duplicates into one active
-- teacher membership. Subjects remain available as a comma-separated list.
with duplicate_groups as (
  select
    principal_id,
    normalized_teacher_email,
    normalized_school_name,
    (array_agg(id order by (user_id is not null) desc, created_at asc, id asc))[1] as keeper_id,
    count(*) as row_count,
    count(distinct lower(btrim(coalesce(grade_level, '')))) as grade_count,
    count(distinct lower(btrim(coalesce(section, ''))))
      filter (where nullif(btrim(section), '') is not null) as section_count,
    bool_and(
      nullif(btrim(section), '') is null
      or btrim(section) !~ '^[0-9]+$'
    ) as sections_are_subjects,
    bool_or(lower(btrim(coalesce(grade_level, ''))) = 'subject teacher') as explicitly_subject_teacher,
    string_agg(distinct nullif(btrim(section), ''), ', ' order by nullif(btrim(section), '')) as subjects
  from public.school_assignments
  where is_active
    and principal_id is not null
    and normalized_teacher_email <> ''
    and normalized_school_name <> ''
  group by principal_id, normalized_teacher_email, normalized_school_name
  having count(*) > 1
),
linked_identity as (
  select distinct on (grouped.keeper_id)
    grouped.keeper_id,
    grouped.row_count,
    grouped.grade_count,
    grouped.section_count,
    grouped.sections_are_subjects,
    grouped.explicitly_subject_teacher,
    grouped.subjects,
    assignment.user_id,
    assignment.teacher_name,
    assignment.profile_image_url
  from duplicate_groups grouped
  join public.school_assignments assignment
    on assignment.principal_id = grouped.principal_id
   and assignment.normalized_teacher_email = grouped.normalized_teacher_email
   and assignment.normalized_school_name = grouped.normalized_school_name
   and assignment.is_active
  order by grouped.keeper_id, (assignment.user_id is not null) desc, assignment.created_at asc
)
update public.school_assignments keeper
set user_id = coalesce(identity_row.user_id, keeper.user_id),
    teacher_name = coalesce(identity_row.teacher_name, keeper.teacher_name),
    profile_image_url = coalesce(identity_row.profile_image_url, keeper.profile_image_url),
    grade_level = case
      when identity_row.explicitly_subject_teacher
        or (
          identity_row.row_count > 1
          and identity_row.grade_count > 1
          and identity_row.section_count > 1
          and identity_row.sections_are_subjects
        )
        then 'Subject Teacher'
      else keeper.grade_level
    end,
    section = case
      when identity_row.explicitly_subject_teacher
        or (
          identity_row.row_count > 1
          and identity_row.grade_count > 1
          and identity_row.section_count > 1
          and identity_row.sections_are_subjects
        )
        then coalesce(identity_row.subjects, keeper.section)
      else keeper.section
    end
from linked_identity identity_row
where keeper.id = identity_row.keeper_id;

with ranked as (
  select
    id,
    row_number() over (
      partition by principal_id, normalized_teacher_email, normalized_school_name
      order by (user_id is not null) desc, created_at asc, id asc
    ) as row_number
  from public.school_assignments
  where is_active
    and principal_id is not null
    and normalized_teacher_email <> ''
    and normalized_school_name <> ''
)
update public.school_assignments assignment
set is_active = false,
    deleted_at = coalesce(assignment.deleted_at, now())
from ranked
where ranked.id = assignment.id
  and ranked.row_number > 1;

create unique index if not exists school_assignments_active_teacher_school_uidx
  on public.school_assignments (
    principal_id,
    normalized_teacher_email,
    normalized_school_name
  )
  where is_active
    and principal_id is not null
    and normalized_teacher_email <> ''
    and normalized_school_name <> '';

create index if not exists school_assignments_principal_active_idx
  on public.school_assignments (principal_id, is_active, created_at);

-- Keep the normalized membership table aligned when it is present.
with ranked_memberships as (
  select
    id,
    first_value(id) over (
      partition by lower(btrim(teacher_email)), school_id
      order by
        (status = 'active') desc,
        (teacher_id is not null) desc,
        added_at asc,
        id asc
    ) as keeper_id,
    row_number() over (
      partition by lower(btrim(teacher_email)), school_id
      order by
        (status = 'active') desc,
        (teacher_id is not null) desc,
        added_at asc,
        id asc
    ) as row_number
  from public.teacher_school_memberships
),
merged_memberships as (
  select
    ranked.keeper_id,
    (array_agg(membership.teacher_id order by (membership.teacher_id is not null) desc))[1] as teacher_id,
    (array_agg(membership.principal_id order by (membership.status = 'active') desc, membership.added_at desc))[1] as principal_id,
    (array_agg(membership.district_id order by (membership.district_id is not null) desc))[1] as district_id,
    (array_agg(membership.status order by (membership.status = 'active') desc, membership.added_at desc))[1] as status
  from ranked_memberships ranked
  join public.teacher_school_memberships membership
    on lower(btrim(membership.teacher_email)) = (
      select lower(btrim(keeper.teacher_email))
      from public.teacher_school_memberships keeper
      where keeper.id = ranked.keeper_id
    )
   and membership.school_id = (
      select keeper.school_id
      from public.teacher_school_memberships keeper
      where keeper.id = ranked.keeper_id
    )
  group by ranked.keeper_id
)
update public.teacher_school_memberships keeper
set teacher_id = coalesce(merged.teacher_id, keeper.teacher_id),
    principal_id = merged.principal_id,
    district_id = coalesce(merged.district_id, keeper.district_id),
    status = merged.status
from merged_memberships merged
where keeper.id = merged.keeper_id;

with ranked_memberships as (
  select
    id,
    row_number() over (
      partition by lower(btrim(teacher_email)), school_id
      order by
        (status = 'active') desc,
        (teacher_id is not null) desc,
        added_at asc,
        id asc
    ) as row_number
  from public.teacher_school_memberships
)
delete from public.teacher_school_memberships membership
using ranked_memberships ranked
where membership.id = ranked.id
  and ranked.row_number > 1;

update public.teacher_school_memberships
set teacher_email = lower(btrim(teacher_email))
where teacher_email is distinct from lower(btrim(teacher_email));

create unique index if not exists teacher_memberships_normalized_email_school_uidx
  on public.teacher_school_memberships (lower(btrim(teacher_email)), school_id);

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

  select profile.* into v_teacher_profile
  from public.profiles profile
  where lower(btrim(profile.email)) = v_email
    and exists (
      select 1 from public.user_roles role
      where role.user_id = profile.user_id and role.role = 'teacher'
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
      case
        when lower(btrim(p_grade_level)) = 'subject teacher'
          then regexp_split_to_array(coalesce(p_section, ''), '\s*,\s*')
        else array[]::text[]
      end,
      case when v_teacher_profile.user_id is null then null else now() end
    )
    on conflict (teacher_email, school_id) do update
    set teacher_id = excluded.teacher_id,
        principal_id = excluded.principal_id,
        district_id = excluded.district_id,
        status = excluded.status,
        grade_level = excluded.grade_level,
        section = excluded.section,
        subjects = excluded.subjects,
        approved_at = excluded.approved_at;
  end if;

  return jsonb_build_object(
    'assignment_id', v_target.id,
    'created', v_created,
    'linked_user_id', v_target.user_id,
    'teacher_name', v_target.teacher_name,
    'teacher_email', v_target.teacher_email
  );
end;
$$;

create or replace function public.remove_principal_teacher_membership(
  p_assignment_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_principal_id uuid := auth.uid();
  v_assignment public.school_assignments%rowtype;
  v_school_id uuid;
  v_affected integer := 0;
begin
  if v_principal_id is null then
    raise exception 'Not authenticated.' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.user_roles
    where user_id = v_principal_id and role = 'school_head'
  ) then
    raise exception 'Only a School Head can remove teacher memberships.'
      using errcode = '42501';
  end if;

  select * into v_assignment
  from public.school_assignments
  where id = p_assignment_id
    and principal_id = v_principal_id
    and is_active
  for update;

  if v_assignment.id is null then
    raise exception 'Teacher record not found or already removed.'
      using errcode = 'P0002';
  end if;

  update public.school_assignments
  set is_active = false,
      deleted_at = now(),
      deleted_by = v_principal_id
  where principal_id = v_principal_id
    and normalized_teacher_email = v_assignment.normalized_teacher_email
    and normalized_school_name = v_assignment.normalized_school_name
    and is_active;

  get diagnostics v_affected = row_count;

  select id into v_school_id
  from public.schools
  where principal_id = v_principal_id
     or regexp_replace(lower(btrim(school_name)), '\s+', ' ', 'g') =
        v_assignment.normalized_school_name
  order by (principal_id = v_principal_id) desc, updated_at desc nulls last
  limit 1;

  if v_school_id is not null then
    update public.teacher_school_memberships
    set status = 'suspended'
    where principal_id = v_principal_id
      and school_id = v_school_id
      and lower(btrim(teacher_email)) = v_assignment.normalized_teacher_email;
  end if;

  if v_affected = 0 then
    raise exception 'Teacher membership could not be removed.'
      using errcode = 'P0001';
  end if;

  return v_affected;
end;
$$;

revoke all on function public.upsert_principal_teacher_membership(uuid, text, text, text, text, text) from public;
grant execute on function public.upsert_principal_teacher_membership(uuid, text, text, text, text, text) to authenticated;

revoke all on function public.remove_principal_teacher_membership(uuid) from public;
grant execute on function public.remove_principal_teacher_membership(uuid) to authenticated;

drop policy if exists "Principals can update teachers in their school" on public.school_assignments;
create policy "Principals can update teachers in their school"
on public.school_assignments for update to authenticated
using (
  principal_id = auth.uid()
  and exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'school_head'
  )
)
with check (
  principal_id = auth.uid()
  and exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'school_head'
  )
);

drop policy if exists "Principals can delete teachers from their school" on public.school_assignments;
create policy "Principals can delete teachers from their school"
on public.school_assignments for delete to authenticated
using (
  principal_id = auth.uid()
  and exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'school_head'
  )
);
