-- Add new columns to school_assignments for teacher management
ALTER TABLE school_assignments 
ADD COLUMN IF NOT EXISTS teacher_email TEXT,
ADD COLUMN IF NOT EXISTS teacher_name TEXT,
ADD COLUMN IF NOT EXISTS grade_level TEXT,
ADD COLUMN IF NOT EXISTS section TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Create schools table for supervisor management
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL,
  address TEXT,
  district_name TEXT NOT NULL,
  principal_id UUID REFERENCES auth.users(id),
  principal_name TEXT,
  principal_email TEXT,
  supervisor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on schools table
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schools table
CREATE POLICY "Supervisors can view schools in their district"
ON schools FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN user_roles ON user_roles.user_id = profiles.user_id
    WHERE profiles.user_id = auth.uid()
    AND profiles.district_name = schools.district_name
    AND user_roles.role = 'supervisor'
  )
);

CREATE POLICY "Supervisors can insert schools in their district"
ON schools FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN user_roles ON user_roles.user_id = profiles.user_id
    WHERE profiles.user_id = auth.uid()
    AND profiles.district_name = schools.district_name
    AND user_roles.role = 'supervisor'
  )
);

CREATE POLICY "Supervisors can update schools in their district"
ON schools FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN user_roles ON user_roles.user_id = profiles.user_id
    WHERE profiles.user_id = auth.uid()
    AND profiles.district_name = schools.district_name
    AND user_roles.role = 'supervisor'
  )
);

CREATE POLICY "Principals can view their own school"
ON schools FOR SELECT
TO authenticated
USING (principal_id = auth.uid());

-- Update school_assignments RLS to allow principals to insert teachers
CREATE POLICY "Principals can insert teachers for their school"
ON school_assignments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN user_roles ON user_roles.user_id = profiles.user_id
    WHERE profiles.user_id = auth.uid()
    AND profiles.school = school_assignments.school_name
    AND user_roles.role = 'school_head'
  )
);

CREATE POLICY "Principals can update teachers in their school"
ON school_assignments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN user_roles ON user_roles.user_id = profiles.user_id
    WHERE profiles.user_id = auth.uid()
    AND profiles.school = school_assignments.school_name
    AND user_roles.role = 'school_head'
  )
);

-- Update teacher_submissions default status to 'submitted'
ALTER TABLE teacher_submissions 
ALTER COLUMN status SET DEFAULT 'submitted';

-- Create trigger for schools updated_at
CREATE TRIGGER update_schools_updated_at
BEFORE UPDATE ON schools
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();