
-- 1) Minimal profiles table for Teacher Name + School, mapped to auth users via user_id (no FK)
create table if not exists public.profiles (
  user_id uuid primary key,
  teacher_name text not null,
  school text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful unique index (optional but recommended)
create unique index if not exists profiles_email_key on public.profiles (email);

-- 2) Enable RLS and add strict policies (user can only manage their own row)
alter table public.profiles enable row level security;

-- Deny-all restrictive policy (safety net)
drop policy if exists "restrictive_all_profiles" on public.profiles;
create policy "restrictive_all_profiles"
  on public.profiles
  as restrictive
  for all
  using (false)
  with check (false);

-- Allow user to read their own profile
drop policy if exists "read_own_profile" on public.profiles;
create policy "read_own_profile"
  on public.profiles
  for select
  using (auth.uid() = user_id);

-- Allow user to create their own profile
drop policy if exists "create_own_profile" on public.profiles;
create policy "create_own_profile"
  on public.profiles
  for insert
  with check (auth.uid() = user_id);

-- Allow user to update their own profile
drop policy if exists "update_own_profile" on public.profiles;
create policy "update_own_profile"
  on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3) Ensure updated_at is maintained
-- Reuse the existing set_updated_at() function if present; create if missing
do $$
begin
  if not exists (
    select 1 from pg_proc
    where proname = 'set_updated_at'
      and pronamespace = 'public'::regnamespace
  ) then
    create or replace function public.set_updated_at()
    returns trigger as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$ language plpgsql;
  end if;
end $$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
