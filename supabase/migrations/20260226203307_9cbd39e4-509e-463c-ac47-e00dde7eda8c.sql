
-- Create reglas_metodo table
CREATE TABLE public.reglas_metodo (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reto_id uuid NOT NULL REFERENCES public.retos(id),
  nombre text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  -- Condition
  campo text NOT NULL,
  operador text NOT NULL DEFAULT '>=',
  valor text NOT NULL,
  condicion_extra boolean NOT NULL DEFAULT false,
  campo2 text,
  operador2 text,
  valor2 text,
  logica_extra text DEFAULT 'AND',
  -- Action
  accion_tipo text NOT NULL DEFAULT 'contactar',
  accion_mensaje text NOT NULL DEFAULT '',
  tactica_sugerida text,
  -- Assignment
  asignar_a_rol text NOT NULL DEFAULT 'operador',
  prioridad text NOT NULL DEFAULT 'media',
  -- Control
  semanas_activas integer[] NOT NULL DEFAULT '{1,2,3,4}',
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reglas_metodo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read reglas_metodo"
  ON public.reglas_metodo FOR SELECT
  USING (true);

CREATE POLICY "Directors/gerentes can insert reglas_metodo"
  ON public.reglas_metodo FOR INSERT
  WITH CHECK (is_director_or_gerente(auth.uid()));

CREATE POLICY "Directors/gerentes can update reglas_metodo"
  ON public.reglas_metodo FOR UPDATE
  USING (is_director_or_gerente(auth.uid()));

CREATE POLICY "Directors/gerentes can delete reglas_metodo"
  ON public.reglas_metodo FOR DELETE
  USING (is_director_or_gerente(auth.uid()));

CREATE TRIGGER update_reglas_metodo_updated_at
  BEFORE UPDATE ON public.reglas_metodo
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add regla_id to acciones_operativas for duplicate control
ALTER TABLE public.acciones_operativas
  ADD COLUMN IF NOT EXISTS regla_id uuid REFERENCES public.reglas_metodo(id);
