-- Keep every new Auth user synchronized with the application profile and role tables.
create or replace function public.handle_new_auth_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  intended_role public.app_role;
begin
  intended_role := case new.raw_user_meta_data->>'role'
    when 'school_head' then 'school_head'::public.app_role
    when 'supervisor' then 'supervisor'::public.app_role
    else 'teacher'::public.app_role
  end;

  insert into public.profiles (user_id, email, teacher_name, school, district_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data->>'school', ''), 'Unknown School'),
    coalesce(nullif(new.raw_user_meta_data->>'district_name', ''), 'Unknown District')
  )
  on conflict (user_id) do update set
    email = excluded.email,
    teacher_name = excluded.teacher_name,
    updated_at = now();

  insert into public.user_roles (user_id, role)
  values (new.id, intended_role)
  on conflict (user_id, role) do nothing;

  delete from public.user_roles
  where user_id = new.id
    and role <> intended_role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_persist_account on auth.users;
create trigger on_auth_user_created_persist_account
after insert on auth.users
for each row execute function public.handle_new_auth_account();

