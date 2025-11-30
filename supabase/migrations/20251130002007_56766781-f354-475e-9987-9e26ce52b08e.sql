-- Add supervisor_id column to school_assignments for easier lookups
ALTER TABLE school_assignments 
ADD COLUMN IF NOT EXISTS supervisor_id uuid;

-- Update existing records to link to their district's supervisor
UPDATE school_assignments sa
SET supervisor_id = (
  SELECT p.user_id
  FROM profiles p
  JOIN user_roles ur ON p.user_id = ur.user_id
  WHERE sa.district_name = p.district_name
    AND ur.role = 'supervisor'
  LIMIT 1
)
WHERE sa.supervisor_id IS NULL
  AND sa.district_name IS NOT NULL;