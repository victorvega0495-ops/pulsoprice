
-- 1. Add new roles to the enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'coordinador';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'desarrolladora';

-- 2. Add coordinador_id and desarrolladora_id to socias_reto
ALTER TABLE public.socias_reto ADD COLUMN IF NOT EXISTS coordinador_id uuid;
ALTER TABLE public.socias_reto ADD COLUMN IF NOT EXISTS desarrolladora_id uuid;

-- 3. Update fn_validar_transicion_estado to handle new roles
-- (no change needed, it checks reto estado not user roles)

-- 4. Update is_director_or_gerente — no change needed, still checks director/gerente

-- 5. Update the enforce trigger to also allow 'activo' reto estado
CREATE OR REPLACE FUNCTION public.fn_validar_transicion_estado(p_socia_reto_id uuid, p_nuevo_estado text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reto_estado TEXT;
  v_socia_estado TEXT;
BEGIN
  SELECT estado INTO v_socia_estado FROM socias_reto WHERE id = p_socia_reto_id;
  SELECT r.estado INTO v_reto_estado FROM retos r JOIN socias_reto sr ON sr.reto_id = r.id WHERE sr.id = p_socia_reto_id;

  IF v_socia_estado = p_nuevo_estado THEN RETURN TRUE; END IF;

  -- graduada/no_graduada only when reto is en_cierre or cerrado
  IF p_nuevo_estado IN ('graduada', 'no_graduada') AND v_reto_estado NOT IN ('en_cierre', 'cerrado') THEN
    RETURN FALSE;
  END IF;

  -- During active reto
  IF v_reto_estado IN ('borrador', 'publicado', 'activo') THEN
    CASE v_socia_estado
      WHEN 'inscrita' THEN RETURN p_nuevo_estado = 'activa';
      WHEN 'activa' THEN RETURN p_nuevo_estado IN ('en_riesgo', 'inactiva');
      WHEN 'en_riesgo' THEN RETURN p_nuevo_estado IN ('activa', 'inactiva');
      WHEN 'inactiva' THEN RETURN p_nuevo_estado IN ('en_riesgo', 'activa');
      WHEN 'graduada' THEN RETURN p_nuevo_estado IN ('activa', 'en_riesgo', 'inactiva', 'inscrita');
      WHEN 'no_graduada' THEN RETURN p_nuevo_estado IN ('activa', 'en_riesgo', 'inactiva', 'inscrita');
      ELSE RETURN FALSE;
    END CASE;
  END IF;

  IF v_reto_estado IN ('en_cierre', 'cerrado') THEN
    RETURN p_nuevo_estado IN ('graduada', 'no_graduada', 'activa', 'en_riesgo', 'inactiva');
  END IF;

  RETURN FALSE;
END;
$function$;
