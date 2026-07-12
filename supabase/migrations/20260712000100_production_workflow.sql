-- Production workflow foundation for generation, review, monitoring, and public status.
create table if not exists public.districts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.schools add column if not exists district_id uuid references public.districts(id);
alter table public.schools add column if not exists public_status_enabled boolean not null default false;

create type public.membership_status as enum ('invited','active','declined','suspended');
create type public.weelmat_status as enum ('draft','generated','submitted','returned','resubmitted','reviewed','approved','archived');
create type public.report_status as enum ('draft','submitted','acknowledged','needs_follow_up','completed');

create table public.teacher_school_memberships (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references auth.users(id) on delete cascade,
  teacher_email text not null,
  school_id uuid not null references public.schools(id) on delete cascade,
  principal_id uuid not null references auth.users(id) on delete cascade,
  district_id uuid references public.districts(id),
  status public.membership_status not null default 'invited',
  grade_level text,
  section text,
  subjects text[] not null default '{}',
  added_at timestamptz not null default now(),
  approved_at timestamptz,
  unique (teacher_email, school_id)
);

create table public.weelmat_documents (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id),
  district_id uuid references public.districts(id),
  legacy_matrix_id uuid references public.weelmat_matrices(id),
  title text not null,
  subject text not null,
  grade_level text not null,
  section text,
  week_start date not null,
  week_end date not null,
  school_year text,
  quarter text,
  status public.weelmat_status not null default 'draft',
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weelmat_versions (
  id uuid primary key default gen_random_uuid(),
  weelmat_id uuid not null references public.weelmat_documents(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  content_json jsonb not null,
  source_type text not null default 'teacher_edit',
  ai_prompt text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (weelmat_id, version_number)
);

alter table public.weelmat_documents
  add constraint weelmat_documents_current_version_fk
  foreign key (current_version_id) references public.weelmat_versions(id);

create table public.weelmat_submissions (
  id uuid primary key default gen_random_uuid(),
  weelmat_id uuid not null references public.weelmat_documents(id) on delete cascade,
  teacher_id uuid not null references auth.users(id),
  principal_id uuid not null references auth.users(id),
  school_id uuid not null references public.schools(id),
  district_id uuid references public.districts(id),
  submitted_version_id uuid not null references public.weelmat_versions(id),
  status public.weelmat_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  approved_at timestamptz,
  unique (weelmat_id, submitted_version_id)
);

create table public.weelmat_feedback (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.weelmat_submissions(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  feedback_type text not null check (feedback_type in ('comment','return','review','approval','ai_revision')),
  comment text not null,
  created_at timestamptz not null default now()
);

create table public.school_weekly_reports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  principal_id uuid not null references auth.users(id),
  supervisor_id uuid references auth.users(id),
  week_start date not null,
  week_end date not null,
  total_teachers integer not null default 0,
  submitted_count integer not null default 0,
  not_submitted_count integer not null default 0,
  reviewed_count integer not null default 0,
  approved_count integer not null default 0,
  completion_percentage numeric(5,2) not null default 0,
  teacher_snapshot jsonb not null default '[]',
  status public.report_status not null default 'draft',
  amendment_reason text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (school_id, week_start, week_end)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.weelmat_audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index teacher_memberships_teacher_idx on public.teacher_school_memberships(teacher_id, status);
create index teacher_memberships_principal_idx on public.teacher_school_memberships(principal_id, status);
create index weelmat_documents_teacher_status_idx on public.weelmat_documents(teacher_id, status, updated_at desc);
create index weelmat_submissions_principal_status_idx on public.weelmat_submissions(principal_id, status, submitted_at desc);
create index school_reports_supervisor_week_idx on public.school_weekly_reports(supervisor_id, week_start desc);
create index notifications_recipient_unread_idx on public.notifications(recipient_id, read_at, created_at desc);

alter table public.districts enable row level security;
alter table public.teacher_school_memberships enable row level security;
alter table public.weelmat_documents enable row level security;
alter table public.weelmat_versions enable row level security;
alter table public.weelmat_submissions enable row level security;
alter table public.weelmat_feedback enable row level security;
alter table public.school_weekly_reports enable row level security;
alter table public.notifications enable row level security;
alter table public.weelmat_audit_events enable row level security;

create policy districts_authenticated_read on public.districts for select to authenticated using (true);
create policy memberships_teacher_read on public.teacher_school_memberships for select to authenticated using (teacher_id = auth.uid() or lower(teacher_email) = lower(auth.jwt()->>'email'));
create policy memberships_principal_manage on public.teacher_school_memberships for all to authenticated using (principal_id = auth.uid()) with check (principal_id = auth.uid());
create policy memberships_supervisor_read on public.teacher_school_memberships for select to authenticated using (exists (select 1 from public.schools s where s.id = school_id and s.supervisor_id = auth.uid()));

create policy documents_teacher_manage on public.weelmat_documents for all to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy documents_principal_read on public.weelmat_documents for select to authenticated using (exists (select 1 from public.weelmat_submissions ws where ws.weelmat_id = id and ws.principal_id = auth.uid()));
create policy documents_supervisor_read on public.weelmat_documents for select to authenticated using (exists (select 1 from public.schools s where s.id = school_id and s.supervisor_id = auth.uid()));

create policy versions_teacher_manage on public.weelmat_versions for all to authenticated using (exists (select 1 from public.weelmat_documents d where d.id = weelmat_id and d.teacher_id = auth.uid())) with check (created_by = auth.uid() and exists (select 1 from public.weelmat_documents d where d.id = weelmat_id and d.teacher_id = auth.uid()));
create policy versions_reviewers_read on public.weelmat_versions for select to authenticated using (exists (select 1 from public.weelmat_submissions s where s.submitted_version_id = id and (s.principal_id = auth.uid() or exists (select 1 from public.schools sc where sc.id = s.school_id and sc.supervisor_id = auth.uid()))));

create policy submissions_teacher_read on public.weelmat_submissions for select to authenticated using (teacher_id = auth.uid());
create policy submissions_teacher_insert on public.weelmat_submissions for insert to authenticated with check (teacher_id = auth.uid() and exists (select 1 from public.teacher_school_memberships m where m.teacher_id = auth.uid() and m.school_id = school_id and m.principal_id = principal_id and m.status = 'active'));
create policy submissions_principal_manage on public.weelmat_submissions for all to authenticated using (principal_id = auth.uid()) with check (principal_id = auth.uid());
create policy submissions_supervisor_read on public.weelmat_submissions for select to authenticated using (exists (select 1 from public.schools s where s.id = school_id and s.supervisor_id = auth.uid()));

create policy feedback_participants on public.weelmat_feedback for select to authenticated using (exists (select 1 from public.weelmat_submissions s where s.id = submission_id and (s.teacher_id = auth.uid() or s.principal_id = auth.uid())));
create policy feedback_author_insert on public.weelmat_feedback for insert to authenticated with check (author_id = auth.uid() and exists (select 1 from public.weelmat_submissions s where s.id = submission_id and (s.teacher_id = auth.uid() or s.principal_id = auth.uid())));

create policy reports_principal_manage on public.school_weekly_reports for all to authenticated using (principal_id = auth.uid()) with check (principal_id = auth.uid());
create policy reports_supervisor_read on public.school_weekly_reports for select to authenticated using (supervisor_id = auth.uid());
create policy notifications_recipient_read on public.notifications for select to authenticated using (recipient_id = auth.uid());
create policy notifications_recipient_update on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy audit_actor_insert on public.weelmat_audit_events for insert to authenticated with check (actor_id = auth.uid());
create policy audit_related_read on public.weelmat_audit_events for select to authenticated using (actor_id = auth.uid());

create or replace view public.public_school_status as
select
  s.id as school_id,
  s.school_name,
  s.district_name,
  d.grade_level,
  d.section,
  d.subject,
  d.week_start,
  d.week_end,
  p.teacher_name,
  p.profile_image_url,
  case when sub.status = 'approved' then 'Approved' else 'Available' end as availability
from public.weelmat_submissions sub
join public.weelmat_documents d on d.id = sub.weelmat_id
join public.schools s on s.id = sub.school_id and s.public_status_enabled
join public.profiles p on p.user_id = sub.teacher_id
where sub.status in ('reviewed','approved');

-- Backfill normalized memberships from the working legacy assignment table.
insert into public.districts(name)
select distinct district_name from public.school_assignments where district_name is not null and district_name <> ''
on conflict (name) do nothing;

insert into public.teacher_school_memberships(teacher_id, teacher_email, school_id, principal_id, district_id, status, grade_level, section, subjects, approved_at)
select sa.user_id, lower(sa.teacher_email), s.id, sa.principal_id, d.id,
  case when sa.user_id is null then 'invited'::public.membership_status else 'active'::public.membership_status end,
  sa.grade_level, sa.section,
  case when sa.section is null then array[]::text[] else array[sa.section] end,
  case when sa.user_id is null then null else now() end
from public.school_assignments sa
join public.schools s on s.school_name = sa.school_name
left join public.districts d on d.name = sa.district_name
where sa.principal_id is not null and sa.teacher_email is not null
on conflict (teacher_email, school_id) do update set
  teacher_id = excluded.teacher_id,
  principal_id = excluded.principal_id,
  district_id = excluded.district_id,
  status = excluded.status,
  grade_level = excluded.grade_level,
  section = excluded.section,
  approved_at = excluded.approved_at;

grant select on public.public_school_status to anon, authenticated;
