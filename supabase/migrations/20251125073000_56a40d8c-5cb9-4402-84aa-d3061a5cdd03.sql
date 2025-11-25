-- Add missing columns for school and district filtering
ALTER TABLE teacher_submissions ADD COLUMN IF NOT EXISTS school_name TEXT;
ALTER TABLE teacher_submissions ADD COLUMN IF NOT EXISTS district_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS district_name TEXT;
ALTER TABLE school_assignments ADD COLUMN IF NOT EXISTS district_name TEXT;
ALTER TABLE principal_weekly_reports ADD COLUMN IF NOT EXISTS district_name TEXT;

-- Create helper function to get current user's school and district context
CREATE OR REPLACE FUNCTION public.get_user_context()
RETURNS TABLE(
  school_name TEXT,
  district_name TEXT,
  role app_role
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.school,
    p.district_name,
    ur.role
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.user_id
  WHERE p.user_id = auth.uid()
  LIMIT 1;
END;
$$;

-- Update RLS policy for principals to only see their school's submissions
DROP POLICY IF EXISTS "Principals view school submissions" ON teacher_submissions;

CREATE POLICY "Principals view school submissions"
  ON teacher_submissions
  FOR SELECT
  USING (
    (auth.uid() = user_id) OR
    (school_name IS NOT NULL AND EXISTS (
      SELECT 1 FROM profiles
      JOIN user_roles ON user_roles.user_id = profiles.user_id
      WHERE profiles.user_id = auth.uid()
      AND profiles.school = teacher_submissions.school_name
      AND user_roles.role = 'school_head'
    ))
  );

-- Update RLS policy for supervisors to only see their district's reports
DROP POLICY IF EXISTS "Supervisors view all reports" ON principal_weekly_reports;

CREATE POLICY "Supervisors view district reports"
  ON principal_weekly_reports
  FOR SELECT
  USING (
    (auth.uid() = principal_id) OR
    (district_name IS NOT NULL AND EXISTS (
      SELECT 1 FROM profiles
      JOIN user_roles ON user_roles.user_id = profiles.user_id
      WHERE profiles.user_id = auth.uid()
      AND profiles.district_name = principal_weekly_reports.district_name
      AND user_roles.role = 'supervisor'
    ))
  );

-- Update school_assignments RLS to include district filtering  
DROP POLICY IF EXISTS "Principals view school assignments" ON school_assignments;

CREATE POLICY "Principals view school assignments"
  ON school_assignments
  FOR SELECT
  USING (
    (auth.uid() = user_id) OR
    (auth.uid() = principal_id) OR
    (auth.uid() = supervisor_id) OR
    (EXISTS (
      SELECT 1 FROM profiles
      JOIN user_roles ON user_roles.user_id = profiles.user_id
      WHERE profiles.user_id = auth.uid()
      AND (
        (user_roles.role = 'school_head' AND profiles.school = school_assignments.school_name) OR
        (user_roles.role = 'supervisor' AND district_name IS NOT NULL AND profiles.district_name = school_assignments.district_name)
      )
    ))
  );