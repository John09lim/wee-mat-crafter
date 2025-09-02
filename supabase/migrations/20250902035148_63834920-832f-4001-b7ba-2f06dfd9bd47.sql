-- Create table for LogSheet generation history
CREATE TABLE public.logsheet_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  section TEXT NOT NULL,
  date_from DATE,
  date_to DATE,
  competencies JSONB NOT NULL, -- Store all daily competencies
  docx_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.logsheet_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own logsheet history" 
ON public.logsheet_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own logsheet history" 
ON public.logsheet_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_logsheet_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_logsheet_history_updated_at
BEFORE UPDATE ON public.logsheet_history
FOR EACH ROW
EXECUTE FUNCTION public.update_logsheet_history_updated_at();