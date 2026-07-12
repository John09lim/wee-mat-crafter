-- Keep a teacher's assignment metadata aligned when they update their profile.
create or replace function public.sync_profile_school_to_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_school public.schools%rowtype;
begin
  if nullif(trim(new.school), '') is null then
    return new;
  end if;

  select * into matched_school
  from public.schools school
  where lower(trim(school.school_name)) = lower(trim(new.school))
  order by school.updated_at desc nulls last
  limit 1;

  update public.school_assignments assignment
  set school_name = new.school,
      district_name = coalesce(matched_school.district_name, new.district_name, assignment.district_name),
      principal_id = coalesce(matched_school.principal_id, assignment.principal_id),
      supervisor_id = coalesce(matched_school.supervisor_id, assignment.supervisor_id)
  where assignment.user_id = new.user_id
     or lower(trim(assignment.teacher_email)) = lower(trim(new.email));

  return new;
end;
$$;

drop trigger if exists sync_profile_school_to_assignment_trigger on public.profiles;
create trigger sync_profile_school_to_assignment_trigger
after insert or update of school, district_name on public.profiles
for each row execute function public.sync_profile_school_to_assignment();

-- Repair placeholder assignment names for profiles that already contain a school.
update public.school_assignments assignment
set school_name = profile.school,
    district_name = coalesce(school.district_name, profile.district_name, assignment.district_name),
    principal_id = coalesce(school.principal_id, assignment.principal_id),
    supervisor_id = coalesce(school.supervisor_id, assignment.supervisor_id)
from public.profiles profile
left join public.schools school
  on lower(trim(school.school_name)) = lower(trim(profile.school))
where (assignment.user_id = profile.user_id
    or lower(trim(assignment.teacher_email)) = lower(trim(profile.email)))
  and nullif(trim(profile.school), '') is not null
  and (
    nullif(trim(assignment.school_name), '') is null
    or lower(trim(assignment.school_name)) = 'unknown school'
  );
