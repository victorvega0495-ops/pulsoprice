
-- Add scorecard fields to socias_reto
ALTER TABLE public.socias_reto
  ADD COLUMN IF NOT EXISTS score_prospeccion numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_presentacion numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_cierre numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_gestion numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_recurrencia numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS crediprice_activo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS crediprice_monto numeric NOT NULL DEFAULT 0;
