-- Repair the legacy San Miguel school chain so district-level reporting can aggregate it.
update public.schools
set district_name = 'Bacong District', updated_at = now()
where lower(trim(school_name)) = lower('San Miguel Elementary School');

update public.school_assignments
set district_name = 'Bacong District'
where lower(trim(school_name)) = lower('San Miguel Elementary School');

update public.teacher_submissions
set district_name = 'Bacong District'
where lower(trim(school_name)) = lower('San Miguel Elementary School');

update public.profiles
set district_name = 'Bacong District', updated_at = now()
where lower(trim(school)) = lower('San Miguel Elementary School');

update public.schools school
set supervisor_id = supervisor.user_id, updated_at = now()
from public.profiles supervisor
where school.district_name = 'Bacong District'
  and supervisor.district_name = 'Bacong District'
  and exists (
    select 1 from public.user_roles role
    where role.user_id = supervisor.user_id and role.role = 'supervisor'
  )
  and school.supervisor_id is null;

