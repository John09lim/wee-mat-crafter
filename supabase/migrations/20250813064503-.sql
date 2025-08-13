-- WeeLMat initial schema, storage, and policies
-- 1) Tables
CREATE TABLE IF NOT EXISTS public.weelmat_matrices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  grade_level text NOT NULL,
  section text NOT NULL,
  date_from date NOT NULL,
  date_to date NOT NULL,
  competency text NOT NULL,
  code text,
  custom_instructions text,
  ai_json jsonb,
  docx_url text,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.weelmat_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id uuid NOT NULL REFERENCES public.weelmat_matrices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'started',
  step text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) RLS
ALTER TABLE public.weelmat_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weelmat_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_denied_weelmat_matrices ON public.weelmat_matrices;
CREATE POLICY anon_denied_weelmat_matrices ON public.weelmat_matrices
  AS RESTRICTIVE FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS users_manage_own_weelmat_matrices ON public.weelmat_matrices;
CREATE POLICY users_manage_own_weelmat_matrices ON public.weelmat_matrices
  AS RESTRICTIVE FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS anon_denied_weelmat_runs ON public.weelmat_runs;
CREATE POLICY anon_denied_weelmat_runs ON public.weelmat_runs
  AS RESTRICTIVE FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS users_manage_own_weelmat_runs ON public.weelmat_runs;
CREATE POLICY users_manage_own_weelmat_runs ON public.weelmat_runs
  AS RESTRICTIVE FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3) updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_weelmat_matrices_updated_at ON public.weelmat_matrices;
CREATE TRIGGER set_weelmat_matrices_updated_at
BEFORE UPDATE ON public.weelmat_matrices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_weelmat_runs_updated_at ON public.weelmat_runs;
CREATE TRIGGER set_weelmat_runs_updated_at
BEFORE UPDATE ON public.weelmat_runs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Storage bucket for outputs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'weelmat'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('weelmat', 'weelmat', true);
  END IF;
END $$;

-- Storage policies
-- Public read of files in this bucket
DROP POLICY IF EXISTS weelmat_public_read ON storage.objects;
CREATE POLICY weelmat_public_read
ON storage.objects FOR SELECT
USING (bucket_id = 'weelmat');

-- Users can manage files in their own folder (first path segment = auth.uid())
DROP POLICY IF EXISTS weelmat_user_write ON storage.objects;
CREATE POLICY weelmat_user_write
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'weelmat'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS weelmat_user_update ON storage.objects;
CREATE POLICY weelmat_user_update
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'weelmat'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'weelmat'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS weelmat_user_delete ON storage.objects;
CREATE POLICY weelmat_user_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'weelmat'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
