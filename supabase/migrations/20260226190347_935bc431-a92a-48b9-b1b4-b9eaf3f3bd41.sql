
-- Fix mentoras RLS: restrict insert/update to directors and gerentes via a helper function
CREATE OR REPLACE FUNCTION public.is_director_or_gerente(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE auth_id = _user_id
      AND rol IN ('director', 'gerente')
      AND activo = true
  )
$$;

-- Drop overly permissive policies
DROP POLICY "Authenticated can insert mentoras" ON public.mentoras;
DROP POLICY "Authenticated can update mentoras" ON public.mentoras;

-- Recreate with proper checks
CREATE POLICY "Directors/gerentes can insert mentoras"
ON public.mentoras FOR INSERT TO authenticated
WITH CHECK (public.is_director_or_gerente(auth.uid()));

CREATE POLICY "Directors/gerentes can update mentoras"
ON public.mentoras FOR UPDATE TO authenticated
USING (public.is_director_or_gerente(auth.uid()));
