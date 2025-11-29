-- Drop the existing RESTRICTIVE policy
DROP POLICY IF EXISTS "users_manage_own_weelmat_matrices" ON weelmat_matrices;

-- Create the same policy as PERMISSIVE (default)
CREATE POLICY "users_manage_own_weelmat_matrices" 
ON weelmat_matrices
FOR ALL 
TO public
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());