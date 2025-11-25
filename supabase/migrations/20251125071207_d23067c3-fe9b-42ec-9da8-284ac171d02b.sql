-- Create teacher_submissions table
CREATE TABLE public.teacher_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  section TEXT NOT NULL,
  subject TEXT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('docx', 'pdf')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'returned', 'accepted')),
  principal_id UUID REFERENCES auth.users(id),
  principal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teacher_submissions_user_id ON public.teacher_submissions(user_id);
CREATE INDEX idx_teacher_submissions_principal_id ON public.teacher_submissions(principal_id);
CREATE INDEX idx_teacher_submissions_status ON public.teacher_submissions(status);
CREATE INDEX idx_teacher_submissions_week ON public.teacher_submissions(week_start, week_end);

-- Enable RLS
ALTER TABLE public.teacher_submissions ENABLE ROW LEVEL SECURITY;

-- Teachers can view and create their own submissions
CREATE POLICY "Teachers manage own submissions"
  ON public.teacher_submissions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Principals can view submissions from their school
CREATE POLICY "Principals view school submissions"
  ON public.teacher_submissions
  FOR SELECT
  USING (
    principal_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'school_head'
    )
  );

-- Principals can update status and notes
CREATE POLICY "Principals update submissions"
  ON public.teacher_submissions
  FOR UPDATE
  USING (principal_id = auth.uid())
  WITH CHECK (principal_id = auth.uid());

-- Supervisors can view all submissions
CREATE POLICY "Supervisors view all submissions"
  ON public.teacher_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'supervisor'
    )
  );

-- Create principal_weekly_reports table
CREATE TABLE public.principal_weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  total_teachers INT NOT NULL DEFAULT 0,
  submitted_teachers INT NOT NULL DEFAULT 0,
  supervisor_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(principal_id, week_start, week_end)
);

CREATE INDEX idx_principal_reports_principal_id ON public.principal_weekly_reports(principal_id);
CREATE INDEX idx_principal_reports_supervisor_id ON public.principal_weekly_reports(supervisor_id);
CREATE INDEX idx_principal_reports_week ON public.principal_weekly_reports(week_start, week_end);

-- Enable RLS
ALTER TABLE public.principal_weekly_reports ENABLE ROW LEVEL SECURITY;

-- Principals manage their own reports
CREATE POLICY "Principals manage own reports"
  ON public.principal_weekly_reports
  FOR ALL
  USING (auth.uid() = principal_id)
  WITH CHECK (auth.uid() = principal_id);

-- Supervisors can view all reports
CREATE POLICY "Supervisors view all reports"
  ON public.principal_weekly_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'supervisor'
    )
  );

-- Create school_assignments table
CREATE TABLE public.school_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  principal_id UUID REFERENCES auth.users(id),
  supervisor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, school_name)
);

CREATE INDEX idx_school_assignments_user_id ON public.school_assignments(user_id);
CREATE INDEX idx_school_assignments_principal_id ON public.school_assignments(principal_id);
CREATE INDEX idx_school_assignments_supervisor_id ON public.school_assignments(supervisor_id);

-- Enable RLS
ALTER TABLE public.school_assignments ENABLE ROW LEVEL SECURITY;

-- Users can view their own assignments
CREATE POLICY "Users view own assignments"
  ON public.school_assignments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Principals and supervisors can view their schools
CREATE POLICY "Principals view school assignments"
  ON public.school_assignments
  FOR SELECT
  USING (
    auth.uid() = principal_id OR
    auth.uid() = supervisor_id OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('school_head', 'supervisor')
    )
  );

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teacher_submissions_updated_at
  BEFORE UPDATE ON public.teacher_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_principal_reports_updated_at
  BEFORE UPDATE ON public.principal_weekly_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();