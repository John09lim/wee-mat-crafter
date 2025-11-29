-- Update ALL school_assignments records with principal information from profiles table
-- This ensures every teacher sees their correct school head's name and photo

UPDATE school_assignments sa
SET 
  principal_name = p.teacher_name,
  principal_profile_image_url = p.profile_image_url
FROM profiles p
WHERE sa.principal_id = p.user_id
  AND sa.principal_id IS NOT NULL;

-- Also update from schools table as fallback for any that don't have profiles
UPDATE school_assignments sa
SET 
  principal_name = COALESCE(sa.principal_name, s.principal_name)
FROM schools s
WHERE sa.school_name = s.school_name
  AND sa.principal_id = s.principal_id
  AND sa.principal_id IS NOT NULL
  AND (sa.principal_name IS NULL OR sa.principal_name = '');