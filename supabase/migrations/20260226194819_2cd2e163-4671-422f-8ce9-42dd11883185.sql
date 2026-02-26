
-- Allow directors/gerentes to delete ventas_diarias (for reversals)
CREATE POLICY "Directors/gerentes can delete ventas_diarias"
ON public.ventas_diarias
FOR DELETE
USING (is_director_or_gerente(auth.uid()));

-- Allow directors/gerentes to update ventas_diarias
CREATE POLICY "Directors/gerentes can update ventas_diarias"
ON public.ventas_diarias
FOR UPDATE
USING (is_director_or_gerente(auth.uid()));

-- Allow directors/gerentes to update cargas_ventas
CREATE POLICY "Directors/gerentes can update cargas_ventas"
ON public.cargas_ventas
FOR UPDATE
USING (is_director_or_gerente(auth.uid()));
