-- Drop the broken policies that query auth.users table
DROP POLICY IF EXISTS "Teachers can view assignments by their email" ON public.school_assignments;
DROP POLICY IF EXISTS "Teachers can link themselves to unlinked assignments" ON public.school_assignments;

-- Recreate policies using auth.email() function instead
CREATE POLICY "Teachers can view assignments by their email"
ON public.school_assignments
FOR SELECT
USING (
  lower(teacher_email) = lower(auth.email())
);

CREATE POLICY "Teachers can link themselves to unlinked assignments"
ON public.school_assignments
FOR UPDATE
USING (
  user_id IS NULL 
  AND lower(teacher_email) = lower(auth.email())
)
WITH CHECK (
  user_id = auth.uid()
  AND lower(teacher_email) = lower(auth.email())
);