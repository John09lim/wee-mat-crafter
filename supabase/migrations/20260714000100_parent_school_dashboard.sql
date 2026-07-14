-- Give each school head a stable, parent-facing school identifier.
-- Parents never query this table directly; the public dashboard is served by a
-- narrowly scoped Edge Function that returns reporting fields only.
alter table public.profiles
  add column if not exists school_id text;

update public.profiles
set school_id = nullif(upper(regexp_replace(btrim(school_id), '\s+', '', 'g')), '')
where school_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_school_id_format_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_school_id_format_check
      check (school_id is null or school_id ~ '^[A-Z0-9-]{4,20}$');
  end if;
end
$$;

create unique index if not exists profiles_school_id_unique_idx
  on public.profiles (school_id)
  where school_id is not null;

create or replace function public.normalize_profile_school_id()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.school_id is null or btrim(new.school_id) = '' then
    new.school_id := null;
  else
    new.school_id := upper(regexp_replace(btrim(new.school_id), '\s+', '', 'g'));
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_profile_school_id_trigger on public.profiles;
create trigger normalize_profile_school_id_trigger
before insert or update of school_id on public.profiles
for each row execute function public.normalize_profile_school_id();

comment on column public.profiles.school_id is
  'Unique school identifier shared by a school head with parents for read-only submission reporting.';
