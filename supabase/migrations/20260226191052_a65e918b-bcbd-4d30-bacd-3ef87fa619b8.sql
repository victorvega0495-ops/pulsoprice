
-- Enum for reto status
CREATE TYPE public.reto_estado AS ENUM ('borrador', 'publicado', 'cerrado');

-- Enum for socia status in reto
CREATE TYPE public.socia_estado AS ENUM ('inscrita', 'activa', 'en_riesgo', 'inactiva');

-- Enum for graduation level
CREATE TYPE public.graduacion_probable AS ENUM ('G1', 'G2', 'G3');

-- Main retos table
CREATE TABLE public.retos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  meta_estandar numeric NOT NULL DEFAULT 38000,
  tipo_meta text NOT NULL DEFAULT 'estandar', -- 'estandar' or 'personalizada'
  estado reto_estado NOT NULL DEFAULT 'borrador',
  pesos_semanales jsonb NOT NULL DEFAULT '[15, 25, 30, 30]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Socias enrolled in a reto
CREATE TABLE public.socias_reto (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reto_id uuid NOT NULL REFERENCES public.retos(id) ON DELETE CASCADE,
  id_socia text NOT NULL,
  nombre text NOT NULL,
  telefono text,
  tienda_visita text,
  baseline_mensual numeric NOT NULL DEFAULT 0,
  meta_individual numeric NOT NULL DEFAULT 0,
  operador_id uuid,
  mentora_id uuid,
  venta_acumulada numeric NOT NULL DEFAULT 0,
  venta_semanal numeric NOT NULL DEFAULT 0,
  pct_avance numeric NOT NULL DEFAULT 0,
  dias_sin_compra integer NOT NULL DEFAULT 0,
  estado socia_estado NOT NULL DEFAULT 'inscrita',
  graduacion_probable graduacion_probable,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Daily sales records
CREATE TABLE public.ventas_diarias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reto_id uuid NOT NULL REFERENCES public.retos(id) ON DELETE CASCADE,
  socia_reto_id uuid NOT NULL REFERENCES public.socias_reto(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  venta_acumulada numeric NOT NULL DEFAULT 0,
  delta_diario numeric NOT NULL DEFAULT 0,
  carga_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Daily goals per reto (the meta x dia curve)
CREATE TABLE public.metas_diarias_reto (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reto_id uuid NOT NULL REFERENCES public.retos(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  dia_numero integer NOT NULL,
  semana integer NOT NULL,
  meta_acumulada_pct numeric NOT NULL DEFAULT 0,
  meta_acumulada_valor numeric NOT NULL DEFAULT 0,
  venta_real numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Upload tracking
CREATE TABLE public.cargas_ventas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reto_id uuid NOT NULL REFERENCES public.retos(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  archivo_nombre text NOT NULL,
  total_socias integer NOT NULL DEFAULT 0,
  venta_total_dia numeric NOT NULL DEFAULT 0,
  alertas integer NOT NULL DEFAULT 0,
  cargado_por uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.retos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.socias_reto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_diarias_reto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargas_ventas ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated can read all these tables
CREATE POLICY "Authenticated can read retos" ON public.retos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read socias_reto" ON public.socias_reto FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read ventas_diarias" ON public.ventas_diarias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read metas_diarias_reto" ON public.metas_diarias_reto FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read cargas_ventas" ON public.cargas_ventas FOR SELECT TO authenticated USING (true);

-- Only directors/gerentes can insert/update
CREATE POLICY "Directors/gerentes can insert retos" ON public.retos FOR INSERT TO authenticated
  WITH CHECK (public.is_director_or_gerente(auth.uid()));
CREATE POLICY "Directors/gerentes can update retos" ON public.retos FOR UPDATE TO authenticated
  USING (public.is_director_or_gerente(auth.uid()));

CREATE POLICY "Directors/gerentes can insert socias_reto" ON public.socias_reto FOR INSERT TO authenticated
  WITH CHECK (public.is_director_or_gerente(auth.uid()));
CREATE POLICY "Directors/gerentes can update socias_reto" ON public.socias_reto FOR UPDATE TO authenticated
  USING (public.is_director_or_gerente(auth.uid()));

CREATE POLICY "Directors/gerentes can insert ventas_diarias" ON public.ventas_diarias FOR INSERT TO authenticated
  WITH CHECK (public.is_director_or_gerente(auth.uid()));

CREATE POLICY "Directors/gerentes can insert metas_diarias_reto" ON public.metas_diarias_reto FOR INSERT TO authenticated
  WITH CHECK (public.is_director_or_gerente(auth.uid()));
CREATE POLICY "Directors/gerentes can update metas_diarias_reto" ON public.metas_diarias_reto FOR UPDATE TO authenticated
  USING (public.is_director_or_gerente(auth.uid()));

CREATE POLICY "Directors/gerentes can insert cargas_ventas" ON public.cargas_ventas FOR INSERT TO authenticated
  WITH CHECK (public.is_director_or_gerente(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_retos_updated_at BEFORE UPDATE ON public.retos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_socias_reto_updated_at BEFORE UPDATE ON public.socias_reto FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_socias_reto_reto_id ON public.socias_reto(reto_id);
CREATE INDEX idx_ventas_diarias_reto_id ON public.ventas_diarias(reto_id);
CREATE INDEX idx_ventas_diarias_socia_reto_id ON public.ventas_diarias(socia_reto_id);
CREATE INDEX idx_metas_diarias_reto_reto_id ON public.metas_diarias_reto(reto_id);
CREATE INDEX idx_cargas_ventas_reto_id ON public.cargas_ventas(reto_id);
