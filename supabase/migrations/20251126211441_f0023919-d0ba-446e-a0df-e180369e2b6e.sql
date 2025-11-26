-- Update the handle_new_user_role function to read role from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  intended_role app_role;
BEGIN
  -- Read role from user_meta_data, default to 'teacher' if not specified
  intended_role := COALESCE(
    (new.raw_user_meta_data->>'role')::app_role, 
    'teacher'::app_role
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, intended_role);
  
  RETURN new;
END;
$$;

-- Clean up duplicate 'teacher' roles for users who are actually school_heads
DELETE FROM public.user_roles 
WHERE role = 'teacher' 
AND user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'school_head'
);

-- Clean up duplicate 'teacher' roles for users who are actually supervisors
DELETE FROM public.user_roles 
WHERE role = 'teacher' 
AND user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'supervisor'
);