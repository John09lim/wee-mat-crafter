-- Backfill teacher role for all existing users without roles
-- This ensures all 1,350+ users who signed up before the role system can log in

INSERT INTO user_roles (user_id, role)
SELECT u.id, 'teacher'::app_role
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
)
ON CONFLICT (user_id, role) DO NOTHING;