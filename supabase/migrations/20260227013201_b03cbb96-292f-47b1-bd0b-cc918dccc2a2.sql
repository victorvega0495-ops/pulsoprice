
-- Function to validate state transitions
CREATE OR REPLACE FUNCTION public.fn_validar_transicion_estado(
  p_socia_reto_id UUID,
  p_nuevo_estado TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reto_estado TEXT;
  v_socia_estado TEXT;
BEGIN
  -- Get current socia state
  SELECT estado INTO v_socia_estado
  FROM socias_reto WHERE id = p_socia_reto_id;

  -- Get reto state
  SELECT r.estado INTO v_reto_estado
  FROM retos r
  JOIN socias_reto sr ON sr.reto_id = r.id
  WHERE sr.id = p_socia_reto_id;

  -- If same state, always allow
  IF v_socia_estado = p_nuevo_estado THEN
    RETURN TRUE;
  END IF;

  -- graduada only when reto is cerrado
  IF p_nuevo_estado = 'graduada' AND v_reto_estado NOT IN ('cerrado') THEN
    RETURN FALSE;
  END IF;

  -- During active reto (borrador or publicado), validate transitions
  IF v_reto_estado IN ('borrador', 'publicado') THEN
    CASE v_socia_estado
      WHEN 'inscrita' THEN
        RETURN p_nuevo_estado = 'activa';
      WHEN 'activa' THEN
        RETURN p_nuevo_estado IN ('en_riesgo', 'inactiva');
      WHEN 'en_riesgo' THEN
        RETURN p_nuevo_estado IN ('activa', 'inactiva');
      WHEN 'inactiva' THEN
        RETURN p_nuevo_estado IN ('en_riesgo', 'activa');
      WHEN 'graduada' THEN
        -- Allow correcting graduada back during active reto
        RETURN p_nuevo_estado IN ('activa', 'en_riesgo', 'inactiva', 'inscrita');
      ELSE
        RETURN FALSE;
    END CASE;
  END IF;

  -- When reto is cerrado, allow graduation
  IF v_reto_estado = 'cerrado' THEN
    RETURN p_nuevo_estado IN ('graduada', 'activa', 'en_riesgo', 'inactiva');
  END IF;

  RETURN FALSE;
END;
$$;

-- Trigger function that enforces valid transitions
CREATE OR REPLACE FUNCTION public.enforce_socia_state_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only check if estado is actually changing
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    IF NOT fn_validar_transicion_estado(NEW.id, NEW.estado) THEN
      RAISE WARNING 'Invalid state transition for socia % from % to % — blocked by trigger', NEW.id, OLD.estado, NEW.estado;
      NEW.estado := OLD.estado; -- Keep old state instead of failing
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach the trigger
DROP TRIGGER IF EXISTS enforce_socia_state_transition ON public.socias_reto;
CREATE TRIGGER enforce_socia_state_transition
  BEFORE UPDATE ON public.socias_reto
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_socia_state_transition();
