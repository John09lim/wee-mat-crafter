-- Fix RLS policy for school_assignments to be PERMISSIVE
DROP POLICY IF EXISTS "Principals can insert teachers for their school" ON school_assignments;

CREATE POLICY "Principals can insert teachers for their school"
ON school_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN user_roles ON user_roles.user_id = profiles.user_id
    WHERE profiles.user_id = auth.uid()
      AND profiles.school = school_assignments.school_name
      AND user_roles.role = 'school_head'::app_role
  )
);

-- Add profile_image_url column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;