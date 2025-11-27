-- Fix RLS policies on profiles table
DROP POLICY IF EXISTS "restrictive_all_profiles" ON profiles;

-- Update role assignment trigger to properly read role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  intended_role app_role;
BEGIN
  -- Read role from user_meta_data, checking multiple possible locations
  intended_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role,
    (NEW.raw_app_meta_data->>'role')::app_role,
    'teacher'::app_role
  );
  
  -- Only insert if not already exists (prevent duplicates)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, intended_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Create profiles for all existing auth users who don't have one
INSERT INTO profiles (user_id, email, teacher_name, school, district_name)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'Unknown School',
  'Unknown District'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

-- Clean up duplicate teacher roles for users who have school_head or supervisor
DELETE FROM user_roles ur1
WHERE ur1.role = 'teacher'
AND EXISTS (
  SELECT 1 FROM user_roles ur2 
  WHERE ur2.user_id = ur1.user_id 
  AND ur2.role IN ('school_head', 'supervisor')
  AND ur2.id != ur1.id
);