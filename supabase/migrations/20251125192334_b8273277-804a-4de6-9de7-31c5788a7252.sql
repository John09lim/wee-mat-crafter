-- Enable realtime for teacher_submissions table
ALTER TABLE public.teacher_submissions REPLICA IDENTITY FULL;

-- Add teacher_submissions to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_submissions;