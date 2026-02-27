-- Fix: fn_validar_transicion_estado expects text but trigger passes socia_estado enum
-- Solution: Create an overloaded version that accepts the enum type
CREATE OR REPLACE FUNCTION public.fn_validar_transicion_estado(p_socia_reto_id uuid, p_nuevo_estado socia_estado)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN fn_validar_transicion_estado(p_socia_reto_id, p_nuevo_estado::text);
END;
$function$;