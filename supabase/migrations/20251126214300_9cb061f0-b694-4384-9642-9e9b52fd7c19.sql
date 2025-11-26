-- Make user_id nullable in school_assignments
-- This allows principals to add teachers before they sign up
ALTER TABLE school_assignments 
ALTER COLUMN user_id DROP NOT NULL;