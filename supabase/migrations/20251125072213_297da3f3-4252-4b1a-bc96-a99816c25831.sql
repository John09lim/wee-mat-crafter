-- Add student_docx_url column to weelmat_matrices table for simplified student version
ALTER TABLE weelmat_matrices 
ADD COLUMN IF NOT EXISTS student_docx_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN weelmat_matrices.student_docx_url IS 'Public URL for the student version DOCX (simplified, no answer keys, no Expected Output, no Contingency)';