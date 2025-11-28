-- Fix the handle_new_user trigger to stop reading role from metadata
-- This was causing "invalid input value for enum user_role: 'teacher'" errors
-- because it was trying to insert app_role values (teacher/school_head/supervisor)
-- into user_profiles.role which expects user_role values (admin/premium/free)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name,
        role
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'free'::public.user_role  -- Always default to 'free', don't read from metadata
    );
    RETURN NEW;
END;
$$;

-- Note: The handle_new_user_role() trigger separately handles inserting 
-- the correct app_role (teacher/school_head/supervisor) into user_roles table