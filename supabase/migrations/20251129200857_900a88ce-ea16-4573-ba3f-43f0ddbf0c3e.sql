-- Enable principals to delete teachers from their school
CREATE POLICY "Principals can delete teachers from their school"
ON public.school_assignments
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    JOIN user_roles ON user_roles.user_id = profiles.user_id
    WHERE profiles.user_id = auth.uid()
      AND profiles.school = school_assignments.school_name
      AND user_roles.role = 'school_head'::app_role
  )
);