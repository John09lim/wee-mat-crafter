-- General district reporting synchronization for every school, not a named exception.
create or replace function public.sync_school_reporting_chain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.supervisor_id is null and nullif(trim(new.district_name), '') is not null then
    select profile.user_id into new.supervisor_id
    from public.profiles profile
    join public.user_roles role on role.user_id = profile.user_id and role.role = 'supervisor'
    where lower(trim(profile.district_name)) = lower(trim(new.district_name))
    order by profile.updated_at desc nulls last
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_school_reporting_chain_trigger on public.schools;
create trigger sync_school_reporting_chain_trigger
before insert or update of district_name, supervisor_id on public.schools
for each row execute function public.sync_school_reporting_chain();

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

  if matched_school.id is not null then
    new.district_name := matched_school.district_name;
    new.supervisor_id := coalesce(new.supervisor_id, matched_school.supervisor_id);
    new.principal_id := coalesce(new.principal_id, matched_school.principal_id);
  end if;
  return new;
end;
$$;

drop trigger if exists sync_assignment_reporting_chain_trigger on public.school_assignments;
create trigger sync_assignment_reporting_chain_trigger
before insert or update of school_name, district_name, supervisor_id on public.school_assignments
for each row execute function public.sync_assignment_reporting_chain();

create or replace function public.sync_submission_reporting_chain()
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

  if matched_school.id is not null then
    new.district_name := matched_school.district_name;
    new.principal_id := coalesce(new.principal_id, matched_school.principal_id);
  elsif new.user_id is not null then
    select assignment.district_name, assignment.principal_id
      into new.district_name, new.principal_id
    from public.school_assignments assignment
    where assignment.user_id = new.user_id
    order by assignment.created_at desc
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_submission_reporting_chain_trigger on public.teacher_submissions;
create trigger sync_submission_reporting_chain_trigger
before insert or update of school_name, district_name, principal_id on public.teacher_submissions
for each row execute function public.sync_submission_reporting_chain();

-- Backfill all existing schools and downstream records.
update public.schools school
set supervisor_id = supervisor.user_id, updated_at = now()
from public.profiles supervisor
where lower(trim(supervisor.district_name)) = lower(trim(school.district_name))
  and exists (
    select 1 from public.user_roles role
    where role.user_id = supervisor.user_id and role.role = 'supervisor'
  )
  and school.supervisor_id is distinct from supervisor.user_id;

update public.school_assignments assignment
set district_name = school.district_name,
    supervisor_id = coalesce(assignment.supervisor_id, school.supervisor_id),
    principal_id = coalesce(assignment.principal_id, school.principal_id)
from public.schools school
where lower(trim(school.school_name)) = lower(trim(assignment.school_name));

update public.teacher_submissions submission
set district_name = school.district_name,
    principal_id = coalesce(submission.principal_id, school.principal_id)
from public.schools school
where lower(trim(school.school_name)) = lower(trim(submission.school_name));

update public.profiles profile
set district_name = school.district_name, updated_at = now()
from public.schools school
where lower(trim(school.school_name)) = lower(trim(profile.school))
  and profile.district_name is distinct from school.district_name;

