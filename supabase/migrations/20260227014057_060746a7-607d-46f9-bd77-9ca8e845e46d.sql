
-- Add missing enum values
ALTER TYPE reto_estado ADD VALUE IF NOT EXISTS 'activo';
ALTER TYPE reto_estado ADD VALUE IF NOT EXISTS 'en_cierre';
ALTER TYPE reto_estado ADD VALUE IF NOT EXISTS 'cancelado';
ALTER TYPE socia_estado ADD VALUE IF NOT EXISTS 'no_graduada';
