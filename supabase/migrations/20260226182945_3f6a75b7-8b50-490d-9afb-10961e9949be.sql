
-- Create enum types for roles and modo_operativo
CREATE TYPE public.user_role AS ENUM ('director', 'gerente', 'operador', 'call_center', 'mentora');

-- Create usuarios table
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  rol user_role NOT NULL DEFAULT 'operador',
  modo_operativo TEXT[] DEFAULT '{}',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own profile
CREATE POLICY "Users can read own profile"
ON public.usuarios
FOR SELECT
TO authenticated
USING (auth.uid() = auth_id);

-- Allow anon to check if any users exist (for setup page)
CREATE POLICY "Anyone can count usuarios"
ON public.usuarios
FOR SELECT
TO anon
USING (true);

-- Allow authenticated users to read all usuarios (for team views)
CREATE POLICY "Authenticated users can read all usuarios"
ON public.usuarios
FOR SELECT
TO authenticated
USING (true);

-- Allow anon to insert first user (setup page)
CREATE POLICY "Anon can insert first user"
ON public.usuarios
FOR INSERT
TO anon
WITH CHECK (
  (SELECT count(*) FROM public.usuarios) = 0
);

-- Allow service role to insert (edge functions)
CREATE POLICY "Authenticated can insert usuarios"
ON public.usuarios
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON public.usuarios
FOR UPDATE
TO authenticated
USING (auth.uid() = auth_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_usuarios_updated_at
BEFORE UPDATE ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
