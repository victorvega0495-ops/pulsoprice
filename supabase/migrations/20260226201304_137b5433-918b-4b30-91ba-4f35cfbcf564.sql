
-- Add 'graduada' to socia_estado enum
ALTER TYPE public.socia_estado ADD VALUE IF NOT EXISTS 'graduada';

-- Add pipeline columns to socias_reto
ALTER TABLE public.socias_reto
  ADD COLUMN IF NOT EXISTS fase_seguimiento text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS operador_seguimiento_id uuid DEFAULT NULL;
