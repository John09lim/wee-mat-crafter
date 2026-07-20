-- Normalize Bacong district spelling and the legacy San Miguel school
-- abbreviation so the supervisor sees one official school identity.

create or replace function public.district_identity_key(value text)
returns text
language sql
immutable
parallel safe
as $$
  select regexp_replace(
    regexp_replace(lower(btrim(coalesce(value, ''))), '\s+', ' ', 'g'),
    '\s+district$',
    ''
  );
$$;

create or replace function public.school_identity_key(value text)
returns text
language sql
immutable
parallel safe
as $$
  select case regexp_replace(lower(btrim(coalesce(value, ''))), '\s+', ' ', 'g')
    when 'san miguel elem school' then 'san miguel elementary school'
    when 'san miguel elem. school' then 'san miguel elementary school'
    when 'san miguel elementary' then 'san miguel elementary school'
    else regexp_replace(lower(btrim(coalesce(value, ''))), '\s+', ' ', 'g')
  end;
$$;

create or replace function public.is_bacong_school(value text)
returns boolean
language sql
immutable
parallel safe
as $$
  select public.school_identity_key(value) = any (array[
    'bacong central school',
    'buntod elementary school',
    'calangag elementary school',
    'fausto sarono tubod elementary school',
    'isugan elementary school',
    'nazario tale memorial elementary school',
    'sacsac elementary school',
    'san miguel elementary school',
    'timbao elementary school',
    'timbanga elementary school',
    'buntod high school',
    'isugan integrated school',
    'ong chee tee bacong high school',
    'san miguel national high school'
  ]);
$$;

create or replace function public.canonical_bacong_school_name(value text)
returns text
language sql
immutable
parallel safe
as $$
  select case public.school_identity_key(value)
    when 'bacong central school' then 'Bacong Central School'
    when 'buntod elementary school' then 'Buntod Elementary School'
    when 'calangag elementary school' then 'Calangag Elementary School'
    when 'fausto sarono tubod elementary school' then 'Fausto Sarono Tubod Elementary School'
    when 'isugan elementary school' then 'Isugan Elementary School'
    when 'nazario tale memorial elementary school' then 'Nazario Tale Memorial Elementary School'
    when 'sacsac elementary school' then 'SacSac Elementary School'
    when 'san miguel elementary school' then 'San Miguel Elementary School'
    when 'timbao elementary school' then 'Timbao Elementary School'
    when 'timbanga elementary school' then 'Timbanga Elementary School'
    when 'buntod high school' then 'Buntod High School'
    when 'isugan integrated school' then 'Isugan Integrated School'
    when 'ong chee tee bacong high school' then 'Ong Chee Tee Bacong High School'
    when 'san miguel national high school' then 'San Miguel National High School'
    else nullif(btrim(value), '')
  end;
$$;

create or replace function public.canonicalize_bacong_reporting_row()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'profiles' then
    if public.district_identity_key(new.district_name) = 'bacong'
       or public.is_bacong_school(new.school) then
      new.district_name := 'Bacong District';
    end if;
    if public.is_bacong_school(new.school) then
      new.school := public.canonical_bacong_school_name(new.school);
    end if;
  else
    if public.district_identity_key(new.district_name) = 'bacong'
       or public.is_bacong_school(new.school_name) then
      new.district_name := 'Bacong District';
    end if;
    if public.is_bacong_school(new.school_name) then
      new.school_name := public.canonical_bacong_school_name(new.school_name);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists a_canonicalize_bacong_profile on public.profiles;
create trigger a_canonicalize_bacong_profile
before insert or update of school, district_name on public.profiles
for each row execute function public.canonicalize_bacong_reporting_row();

drop trigger if exists a_canonicalize_bacong_school on public.schools;
create trigger a_canonicalize_bacong_school
before insert or update of school_name, district_name on public.schools
for each row execute function public.canonicalize_bacong_reporting_row();

drop trigger if exists a_canonicalize_bacong_assignment on public.school_assignments;
create trigger a_canonicalize_bacong_assignment
before insert or update of school_name, district_name on public.school_assignments
for each row execute function public.canonicalize_bacong_reporting_row();

drop trigger if exists a_canonicalize_bacong_submission on public.teacher_submissions;
create trigger a_canonicalize_bacong_submission
before insert or update of school_name, district_name on public.teacher_submissions
for each row execute function public.canonicalize_bacong_reporting_row();

drop trigger if exists a_canonicalize_bacong_report on public.principal_weekly_reports;
create trigger a_canonicalize_bacong_report
before insert or update of school_name, district_name on public.principal_weekly_reports
for each row execute function public.canonicalize_bacong_reporting_row();

-- Recover a Bacong supervisor's canonical district from signup metadata or an
-- existing link before normalizing all downstream records.
update public.profiles profile
set district_name = 'Bacong District',
    updated_at = now()
from auth.users auth_user
where auth_user.id = profile.user_id
  and exists (
    select 1
    from public.user_roles role
    where role.user_id = profile.user_id
      and role.role = 'supervisor'
  )
  and (
    public.district_identity_key(profile.district_name) = 'bacong'
    or public.district_identity_key(auth_user.raw_user_meta_data->>'district_name') = 'bacong'
    or exists (
      select 1 from public.schools school
      where school.supervisor_id = profile.user_id
        and public.is_bacong_school(school.school_name)
    )
    or exists (
      select 1 from public.school_assignments assignment
      where assignment.supervisor_id = profile.user_id
        and public.is_bacong_school(assignment.school_name)
    )
  );

-- Remove only redundant alias assignments that would otherwise collide with
-- the existing (user_id, school_name) uniqueness constraint.
delete from public.school_assignments alias_assignment
where public.school_identity_key(alias_assignment.school_name) = 'san miguel elementary school'
  and lower(btrim(alias_assignment.school_name)) <> 'san miguel elementary school'
  and exists (
    select 1
    from public.school_assignments official_assignment
    where official_assignment.user_id = alias_assignment.user_id
      and lower(btrim(official_assignment.school_name)) = 'san miguel elementary school'
  );

update public.profiles
set school = public.canonical_bacong_school_name(school),
    district_name = 'Bacong District',
    updated_at = now()
where public.district_identity_key(district_name) = 'bacong'
   or public.is_bacong_school(school);

update public.schools
set school_name = public.canonical_bacong_school_name(school_name),
    district_name = 'Bacong District',
    updated_at = now()
where public.district_identity_key(district_name) = 'bacong'
   or public.is_bacong_school(school_name);

update public.school_assignments
set school_name = public.canonical_bacong_school_name(school_name),
    district_name = 'Bacong District'
where public.district_identity_key(district_name) = 'bacong'
   or public.is_bacong_school(school_name);

update public.teacher_submissions
set school_name = public.canonical_bacong_school_name(school_name),
    district_name = 'Bacong District'
where public.district_identity_key(district_name) = 'bacong'
   or public.is_bacong_school(school_name);

update public.principal_weekly_reports
set school_name = public.canonical_bacong_school_name(school_name),
    district_name = 'Bacong District'
where public.district_identity_key(district_name) = 'bacong'
   or public.is_bacong_school(school_name);

create temporary table bacong_school_roster (
  school_name text primary key
) on commit drop;

insert into bacong_school_roster (school_name) values
  ('Bacong Central School'),
  ('Buntod Elementary School'),
  ('Calangag Elementary School'),
  ('Fausto Sarono Tubod Elementary School'),
  ('Isugan Elementary School'),
  ('Nazario Tale Memorial Elementary School'),
  ('SacSac Elementary School'),
  ('San Miguel Elementary School'),
  ('Timbanga Elementary School'),
  ('Timbao Elementary School'),
  ('Buntod High School'),
  ('Isugan Integrated School'),
  ('Ong Chee Tee Bacong High School'),
  ('San Miguel National High School');

insert into public.schools (school_name, district_name)
select roster.school_name, 'Bacong District'
from bacong_school_roster roster
where not exists (
  select 1
  from public.schools school
  where public.school_identity_key(school.school_name) =
        public.school_identity_key(roster.school_name)
);

with ranked_principals as (
  select distinct on (public.school_identity_key(profile.school))
    profile.user_id,
    profile.teacher_name,
    profile.email,
    profile.school
  from public.profiles profile
  join public.user_roles role
    on role.user_id = profile.user_id
   and role.role = 'school_head'
  where public.is_bacong_school(profile.school)
  order by public.school_identity_key(profile.school), profile.updated_at desc nulls last
)
update public.schools school
set principal_id = principal.user_id,
    principal_name = principal.teacher_name,
    principal_email = principal.email,
    district_name = 'Bacong District',
    updated_at = now()
from ranked_principals principal
where public.school_identity_key(school.school_name) =
      public.school_identity_key(principal.school);

with bacong_supervisor as (
  select profile.user_id
  from public.profiles profile
  join public.user_roles role
    on role.user_id = profile.user_id
   and role.role = 'supervisor'
  where public.district_identity_key(profile.district_name) = 'bacong'
  order by profile.updated_at desc nulls last
  limit 1
)
update public.schools school
set supervisor_id = supervisor.user_id,
    district_name = 'Bacong District',
    updated_at = now()
from bacong_supervisor supervisor
where public.is_bacong_school(school.school_name);

update public.school_assignments assignment
set principal_id = coalesce(assignment.principal_id, school.principal_id),
    principal_name = coalesce(assignment.principal_name, school.principal_name),
    supervisor_id = coalesce(school.supervisor_id, assignment.supervisor_id),
    district_name = 'Bacong District'
from public.schools school
where public.school_identity_key(school.school_name) =
      public.school_identity_key(assignment.school_name)
  and public.is_bacong_school(school.school_name);

update public.teacher_submissions submission
set principal_id = coalesce(submission.principal_id, school.principal_id),
    district_name = 'Bacong District'
from public.schools school
where public.school_identity_key(school.school_name) =
      public.school_identity_key(submission.school_name)
  and public.is_bacong_school(school.school_name);

update public.principal_weekly_reports report
set supervisor_id = coalesce(school.supervisor_id, report.supervisor_id),
    district_name = 'Bacong District'
from public.schools school
where public.school_identity_key(school.school_name) =
      public.school_identity_key(report.school_name)
  and public.is_bacong_school(school.school_name);

-- Normalize supervisor visibility for capitalization and optional "District".
drop policy if exists "Supervisors can view schools in their district" on public.schools;
create policy "Supervisors can view schools in their district"
on public.schools for select to authenticated
using (
  exists (
    select 1
    from public.profiles profile
    join public.user_roles role
      on role.user_id = profile.user_id
     and role.role = 'supervisor'
    where profile.user_id = auth.uid()
      and (
        public.district_identity_key(profile.district_name) =
          public.district_identity_key(schools.district_name)
        or (
          public.district_identity_key(profile.district_name) = 'bacong'
          and public.is_bacong_school(schools.school_name)
        )
      )
  )
);

drop policy if exists "Principals view school assignments" on public.school_assignments;
drop policy if exists "Managers view school assignments" on public.school_assignments;
create policy "Managers view school assignments"
on public.school_assignments for select to authenticated
using (
  auth.uid() = user_id
  or auth.uid() = principal_id
  or auth.uid() = supervisor_id
  or exists (
    select 1
    from public.profiles profile
    join public.user_roles role
      on role.user_id = profile.user_id
     and role.role = 'supervisor'
    where profile.user_id = auth.uid()
      and (
        public.district_identity_key(profile.district_name) =
          public.district_identity_key(school_assignments.district_name)
        or (
          public.district_identity_key(profile.district_name) = 'bacong'
          and public.is_bacong_school(school_assignments.school_name)
        )
      )
  )
);

drop policy if exists "Supervisors view all submissions" on public.teacher_submissions;
drop policy if exists "Supervisors view district submissions" on public.teacher_submissions;
create policy "Supervisors view district submissions"
on public.teacher_submissions for select to authenticated
using (
  exists (
    select 1
    from public.profiles profile
    join public.user_roles role
      on role.user_id = profile.user_id
     and role.role = 'supervisor'
    where profile.user_id = auth.uid()
      and (
        public.district_identity_key(profile.district_name) =
          public.district_identity_key(teacher_submissions.district_name)
        or (
          public.district_identity_key(profile.district_name) = 'bacong'
          and public.is_bacong_school(teacher_submissions.school_name)
        )
      )
  )
);

drop policy if exists "Supervisors view all reports" on public.principal_weekly_reports;
drop policy if exists "Supervisors view district reports" on public.principal_weekly_reports;
create policy "Supervisors view district reports"
on public.principal_weekly_reports for select to authenticated
using (
  auth.uid() = principal_id
  or exists (
    select 1
    from public.profiles profile
    join public.user_roles role
      on role.user_id = profile.user_id
     and role.role = 'supervisor'
    where profile.user_id = auth.uid()
      and (
        public.district_identity_key(profile.district_name) =
          public.district_identity_key(principal_weekly_reports.district_name)
        or (
          public.district_identity_key(profile.district_name) = 'bacong'
          and public.is_bacong_school(principal_weekly_reports.school_name)
        )
      )
  )
);

create index if not exists schools_district_identity_idx
  on public.schools (public.district_identity_key(district_name));
create index if not exists school_assignments_district_identity_idx
  on public.school_assignments (public.district_identity_key(district_name));
create index if not exists teacher_submissions_district_week_idx
  on public.teacher_submissions (public.district_identity_key(district_name), week_start desc);
create index if not exists principal_reports_district_week_idx
  on public.principal_weekly_reports (public.district_identity_key(district_name), week_start desc);
