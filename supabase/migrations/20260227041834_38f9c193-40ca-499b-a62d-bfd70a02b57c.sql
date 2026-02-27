-- Add tipo_reto column to retos table
ALTER TABLE public.retos ADD COLUMN tipo_reto text NOT NULL DEFAULT 'operacion';

-- No unique constraint on estado='activo' exists to remove, 
-- but ensure multiple active retos are allowed (no constraint to drop)