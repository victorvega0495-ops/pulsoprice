
-- Fix security definer views - set to security_invoker so RLS is respected
ALTER VIEW public.vista_avance_diario_reto SET (security_invoker = on);
ALTER VIEW public.vista_avance_por_mentora SET (security_invoker = on);
ALTER VIEW public.vista_avance_por_coordinador SET (security_invoker = on);
ALTER VIEW public.vista_pareto SET (security_invoker = on);
ALTER VIEW public.vista_pipeline_seguimiento SET (security_invoker = on);
ALTER VIEW public.vista_cola_trabajo SET (security_invoker = on);
