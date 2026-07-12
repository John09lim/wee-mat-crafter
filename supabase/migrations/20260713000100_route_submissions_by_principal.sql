-- A submission belongs to the principal who created the teacher assignment.
-- School names are mutable display metadata and are not a reliable ownership key.

drop policy if exists "Principals view school submissions" on public.teacher_submissions;

create policy "Principals view assigned submissions"
on public.teacher_submissions
for select
to authenticated
using (
  auth.uid() = user_id
  or auth.uid() = principal_id
);

create index if not exists teacher_submissions_principal_week_created_idx
on public.teacher_submissions (principal_id, week_start, created_at desc);

-- Repair legacy rows that were uploaded before principal_id became the
-- authoritative routing field. Prefer an auth-linked assignment; use an
-- unlinked name match only when the school also matches.
with assignment_candidates as (
  select
    submission.id as submission_id,
    assignment.principal_id,
    assignment.school_name,
    assignment.district_name,
    row_number() over (
      partition by submission.id
      order by
        case when assignment.user_id = submission.user_id then 0 else 1 end,
        assignment.created_at desc
    ) as candidate_rank
  from public.teacher_submissions submission
  join public.school_assignments assignment
    on assignment.principal_id is not null
   and (
     assignment.user_id = submission.user_id
     or (
       assignment.user_id is null
       and lower(trim(assignment.teacher_name)) = lower(trim(submission.teacher_name))
       and lower(trim(assignment.school_name)) = lower(trim(submission.school_name))
     )
   )
  where submission.principal_id is null
)
update public.teacher_submissions submission
set
  principal_id = candidate.principal_id,
  school_name = coalesce(nullif(trim(candidate.school_name), ''), submission.school_name),
  district_name = coalesce(nullif(trim(candidate.district_name), ''), submission.district_name),
  updated_at = now()
from assignment_candidates candidate
where candidate.submission_id = submission.id
  and candidate.candidate_rank = 1;
