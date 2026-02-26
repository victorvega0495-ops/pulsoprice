
-- Fix overly permissive INSERT policy
DROP POLICY "Authenticated can insert usuarios" ON public.usuarios;

CREATE POLICY "Authenticated can insert own usuario"
ON public.usuarios
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = auth_id);
