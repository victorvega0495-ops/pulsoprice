
-- Allow directors/gerentes to delete retos (for borrador/cancelado states - enforced in app code)
CREATE POLICY "Directors/gerentes can delete retos"
ON public.retos
FOR DELETE
USING (is_director_or_gerente(auth.uid()));

-- Allow directors/gerentes to delete socias_reto
CREATE POLICY "Directors/gerentes can delete socias_reto"
ON public.socias_reto
FOR DELETE
USING (is_director_or_gerente(auth.uid()));

-- Allow directors/gerentes to delete cargas_ventas
CREATE POLICY "Directors/gerentes can delete cargas_ventas"
ON public.cargas_ventas
FOR DELETE
USING (is_director_or_gerente(auth.uid()));

-- Allow directors/gerentes to delete alertas (already exists but let's ensure)
-- alertas already has delete policy

-- Allow directors/gerentes to delete acciones_operativas
CREATE POLICY "Directors/gerentes can delete acciones_operativas"
ON public.acciones_operativas
FOR DELETE
USING (is_director_or_gerente(auth.uid()));
