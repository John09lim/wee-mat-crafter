-- Add principal name and profile image URL columns to school_assignments
ALTER TABLE school_assignments 
ADD COLUMN IF NOT EXISTS principal_name text,
ADD COLUMN IF NOT EXISTS principal_profile_image_url text;

-- Backfill existing records with principal information
UPDATE school_assignments sa
SET 
  principal_name = p.teacher_name,
  principal_profile_image_url = p.profile_image_url
FROM profiles p
WHERE sa.principal_id = p.user_id
  AND sa.principal_name IS NULL;