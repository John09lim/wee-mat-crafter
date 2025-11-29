-- Allow teachers to SELECT unlinked assignments by email
CREATE POLICY "Teachers can view assignments by their email"
ON public.school_assignments
FOR SELECT
USING (
  lower(teacher_email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Allow teachers to UPDATE their user_id when unlinked (self-linking only)
CREATE POLICY "Teachers can link themselves to unlinked assignments"
ON public.school_assignments
FOR UPDATE
USING (
  user_id IS NULL 
  AND lower(teacher_email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
)
WITH CHECK (
  user_id = auth.uid()
  AND lower(teacher_email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
);