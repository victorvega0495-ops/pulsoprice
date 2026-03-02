
-- Add usuario_id column to mentoras table
ALTER TABLE public.mentoras ADD COLUMN usuario_id uuid REFERENCES public.usuarios(id);
