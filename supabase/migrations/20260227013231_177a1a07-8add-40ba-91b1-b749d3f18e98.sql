
-- Temporarily disable the trigger to fix existing bad data
ALTER TABLE public.socias_reto DISABLE TRIGGER enforce_socia_state_transition;

-- Fix all socias incorrectly marked as graduada in non-cerrado retos
UPDATE public.socias_reto sr
SET estado = (CASE
  WHEN sr.dias_sin_compra < 3 AND sr.venta_acumulada > 0 THEN 'activa'
  WHEN sr.dias_sin_compra >= 3 AND sr.dias_sin_compra < 7 THEN 'en_riesgo'
  WHEN sr.dias_sin_compra >= 7 THEN 'inactiva'
  WHEN sr.venta_acumulada = 0 THEN 'inactiva'
  ELSE 'inscrita'
END)::socia_estado
FROM retos r
WHERE sr.reto_id = r.id
  AND sr.estado = 'graduada'
  AND r.estado != 'cerrado';

-- Re-enable the trigger
ALTER TABLE public.socias_reto ENABLE TRIGGER enforce_socia_state_transition;
