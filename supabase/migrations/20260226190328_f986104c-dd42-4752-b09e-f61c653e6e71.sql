
-- Create mentoras table
CREATE TABLE public.mentoras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  telefono text NOT NULL,
  id_socia text,
  pin_acceso text NOT NULL,
  activa boolean NOT NULL DEFAULT true,
  auth_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add telefono to usuarios if not exists
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS telefono text;

-- Enable RLS on mentoras
ALTER TABLE public.mentoras ENABLE ROW LEVEL SECURITY;

-- Policies for mentoras - authenticated users can read
CREATE POLICY "Authenticated users can read mentoras"
ON public.mentoras FOR SELECT TO authenticated
USING (true);

-- Directors and gerentes can insert mentoras
CREATE POLICY "Authenticated can insert mentoras"
ON public.mentoras FOR INSERT TO authenticated
WITH CHECK (true);

-- Authenticated can update mentoras
CREATE POLICY "Authenticated can update mentoras"
ON public.mentoras FOR UPDATE TO authenticated
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_mentoras_updated_at
BEFORE UPDATE ON public.mentoras
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
