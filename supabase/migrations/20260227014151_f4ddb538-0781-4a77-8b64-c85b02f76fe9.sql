
-- ============================================
-- Add missing columns to existing tables
-- ============================================
ALTER TABLE public.retos ADD COLUMN IF NOT EXISTS pesos_diarios jsonb;
ALTER TABLE public.retos ADD COLUMN IF NOT EXISTS tiendas text[];
ALTER TABLE public.mentoras ADD COLUMN IF NOT EXISTS retos_count integer DEFAULT 0;
ALTER TABLE public.socias_reto ADD COLUMN IF NOT EXISTS semana_activa integer DEFAULT 1;
ALTER TABLE public.socias_reto ADD COLUMN IF NOT EXISTS cluster_color text;
ALTER TABLE public.socias_reto ADD COLUMN IF NOT EXISTS scorecard_habilidades jsonb DEFAULT '{"H1_prospeccion":0,"H2_presentacion":0,"H3_cierre":0,"H4_gestion":0,"H5_recurrencia":0}'::jsonb;
ALTER TABLE public.cargas_ventas ADD COLUMN IF NOT EXISTS socias_con_error integer DEFAULT 0;
ALTER TABLE public.cargas_ventas ADD COLUMN IF NOT EXISTS status text DEFAULT 'procesando';
ALTER TABLE public.interacciones ADD COLUMN IF NOT EXISTS mentora_id uuid;
ALTER TABLE public.interacciones ADD COLUMN IF NOT EXISTS resultado text;
ALTER TABLE public.acciones_operativas ADD COLUMN IF NOT EXISTS contexto_ia text;
ALTER TABLE public.acciones_operativas ADD COLUMN IF NOT EXISTS tactica text;
ALTER TABLE public.acciones_operativas ADD COLUMN IF NOT EXISTS feedback_compra_48h boolean;
ALTER TABLE public.acciones_operativas ADD COLUMN IF NOT EXISTS mentora_id uuid;
ALTER TABLE public.ventas_diarias ADD COLUMN IF NOT EXISTS id_socia text;

-- ============================================
-- Deduplicate and add unique indexes
-- ============================================
DELETE FROM public.ventas_diarias a USING public.ventas_diarias b
WHERE a.reto_id = b.reto_id AND a.socia_reto_id = b.socia_reto_id
  AND a.fecha = b.fecha AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_socias_reto_unique ON public.socias_reto(reto_id, id_socia);
CREATE UNIQUE INDEX IF NOT EXISTS idx_metas_diarias_unique ON public.metas_diarias_reto(reto_id, fecha);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ventas_diarias_unique ON public.ventas_diarias(reto_id, socia_reto_id, fecha);
CREATE UNIQUE INDEX IF NOT EXISTS idx_retos_one_active ON public.retos ((true)) WHERE estado = 'activo'::reto_estado;

-- ============================================
-- New tables
-- ============================================
CREATE TABLE IF NOT EXISTS public.guias_contextuales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rol text NOT NULL, semana text, contexto text,
  contenido text NOT NULL, version integer DEFAULT 1,
  editado_por uuid, updated_at timestamptz DEFAULT now(), created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.compromisos_mentora (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reto_id uuid NOT NULL REFERENCES public.retos(id),
  mentora_id uuid NOT NULL REFERENCES public.mentoras(id),
  semana integer NOT NULL,
  plan_top20 jsonb, plan_empuje80 jsonb,
  avance_top20 numeric DEFAULT 0, avance_empuje80 numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reto_id, mentora_id, semana)
);
CREATE TABLE IF NOT EXISTS public.score_mentoras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reto_id uuid NOT NULL REFERENCES public.retos(id),
  mentora_id uuid NOT NULL REFERENCES public.mentoras(id),
  semana integer NOT NULL, score_ponderado numeric,
  distribucion_socias jsonb, created_at timestamptz DEFAULT now(),
  UNIQUE(reto_id, mentora_id, semana)
);
CREATE TABLE IF NOT EXISTS public.alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reto_id uuid NOT NULL REFERENCES public.retos(id),
  socia_id text, tipo text NOT NULL,
  severidad text NOT NULL DEFAULT 'media',
  estado text DEFAULT 'nueva', asignada_a uuid,
  mensaje text, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.listas_llamadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reto_id uuid NOT NULL REFERENCES public.retos(id),
  nombre text NOT NULL, motivo text, creada_por uuid,
  asignada_a uuid, status text DEFAULT 'activa',
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.items_llamada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id uuid NOT NULL REFERENCES public.listas_llamadas(id) ON DELETE CASCADE,
  socia_id text, nombre_socia text, telefono text,
  contexto text, resultado text DEFAULT 'pendiente',
  intentos integer DEFAULT 0, llamada_at timestamptz,
  operador_id uuid, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.activaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reto_id uuid NOT NULL REFERENCES public.retos(id),
  nombre text NOT NULL, tipo text, objetivo text,
  mecanica jsonb, categoria_foco text,
  meta_activacion numeric, resultado numeric,
  estado text DEFAULT 'propuesta', creada_por text,
  aprobada_por uuid, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.analisis_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reto_id uuid NOT NULL REFERENCES public.retos(id),
  socia_id text, operador_id uuid, mentora_id uuid,
  tipo text NOT NULL, contenido jsonb NOT NULL,
  vigencia_hasta timestamptz, created_at timestamptz DEFAULT now()
);

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE public.guias_contextuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compromisos_mentora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_mentoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas_llamadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items_llamada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analisis_ia ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================
CREATE POLICY "read guias" ON public.guias_contextuales FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "manage guias" ON public.guias_contextuales FOR INSERT WITH CHECK (is_director_or_gerente(auth.uid()));
CREATE POLICY "update guias" ON public.guias_contextuales FOR UPDATE USING (is_director_or_gerente(auth.uid()));
CREATE POLICY "delete guias" ON public.guias_contextuales FOR DELETE USING (is_director_or_gerente(auth.uid()));

CREATE POLICY "read compromisos" ON public.compromisos_mentora FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "manage compromisos" ON public.compromisos_mentora FOR INSERT WITH CHECK (is_director_or_gerente(auth.uid()));
CREATE POLICY "update compromisos" ON public.compromisos_mentora FOR UPDATE USING (is_director_or_gerente(auth.uid()));
CREATE POLICY "delete compromisos" ON public.compromisos_mentora FOR DELETE USING (is_director_or_gerente(auth.uid()));

CREATE POLICY "read scores" ON public.score_mentoras FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "manage scores" ON public.score_mentoras FOR INSERT WITH CHECK (is_director_or_gerente(auth.uid()));
CREATE POLICY "update scores" ON public.score_mentoras FOR UPDATE USING (is_director_or_gerente(auth.uid()));

CREATE POLICY "read alertas" ON public.alertas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "insert alertas" ON public.alertas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "update alertas" ON public.alertas FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "delete alertas" ON public.alertas FOR DELETE USING (is_director_or_gerente(auth.uid()));

CREATE POLICY "read listas" ON public.listas_llamadas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "manage listas" ON public.listas_llamadas FOR INSERT WITH CHECK (is_director_or_gerente(auth.uid()));
CREATE POLICY "update listas" ON public.listas_llamadas FOR UPDATE USING (is_director_or_gerente(auth.uid()));
CREATE POLICY "delete listas" ON public.listas_llamadas FOR DELETE USING (is_director_or_gerente(auth.uid()));

CREATE POLICY "read items" ON public.items_llamada FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "insert items" ON public.items_llamada FOR INSERT WITH CHECK (is_director_or_gerente(auth.uid()));
CREATE POLICY "update items" ON public.items_llamada FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "delete items" ON public.items_llamada FOR DELETE USING (is_director_or_gerente(auth.uid()));

CREATE POLICY "read activaciones" ON public.activaciones FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "manage activaciones" ON public.activaciones FOR INSERT WITH CHECK (is_director_or_gerente(auth.uid()));
CREATE POLICY "update activaciones" ON public.activaciones FOR UPDATE USING (is_director_or_gerente(auth.uid()));
CREATE POLICY "delete activaciones" ON public.activaciones FOR DELETE USING (is_director_or_gerente(auth.uid()));

CREATE POLICY "read analisis" ON public.analisis_ia FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "insert analisis" ON public.analisis_ia FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "update analisis" ON public.analisis_ia FOR UPDATE USING (is_director_or_gerente(auth.uid()));
CREATE POLICY "delete analisis" ON public.analisis_ia FOR DELETE USING (is_director_or_gerente(auth.uid()));

-- ============================================
-- Calculated Views
-- ============================================
CREATE OR REPLACE VIEW public.vista_avance_diario_reto AS
SELECT m.id, m.reto_id, m.fecha, m.dia_numero, m.semana,
  m.meta_acumulada_valor AS meta_acumulada_objetivo,
  m.venta_real AS venta_real_acumulada,
  (m.venta_real - m.meta_acumulada_valor) AS diferencia,
  ROUND(m.venta_real / NULLIF(m.meta_acumulada_valor, 0) * 100, 1) AS pct_avance
FROM public.metas_diarias_reto m;

CREATE OR REPLACE VIEW public.vista_avance_por_mentora AS
SELECT sr.reto_id, sr.mentora_id, me.nombre AS mentora_nombre,
  COUNT(*) AS total_socias, SUM(sr.meta_individual) AS meta_grupo,
  SUM(sr.venta_acumulada) AS venta_grupo,
  ROUND(SUM(sr.venta_acumulada) / NULLIF(SUM(sr.meta_individual), 0) * 100, 1) AS pct_avance,
  COUNT(*) FILTER (WHERE sr.venta_acumulada > 0) AS socias_con_compra,
  COUNT(*) FILTER (WHERE sr.estado = 'en_riesgo') AS socias_en_riesgo,
  COUNT(*) FILTER (WHERE sr.estado = 'inactiva') AS socias_inactivas
FROM public.socias_reto sr LEFT JOIN public.mentoras me ON me.id = sr.mentora_id
GROUP BY sr.reto_id, sr.mentora_id, me.nombre;

CREATE OR REPLACE VIEW public.vista_avance_por_coordinador AS
SELECT sr.reto_id, sr.operador_id, u.nombre AS operador_nombre,
  COUNT(*) AS total_socias, SUM(sr.venta_acumulada) AS venta_grupo,
  ROUND(SUM(sr.venta_acumulada) / NULLIF(SUM(sr.meta_individual), 0) * 100, 1) AS pct_avance
FROM public.socias_reto sr LEFT JOIN public.usuarios u ON u.auth_id = sr.operador_id
GROUP BY sr.reto_id, sr.operador_id, u.nombre;

CREATE OR REPLACE VIEW public.vista_pareto AS
SELECT sr.id, sr.reto_id, sr.nombre, sr.id_socia,
  sr.venta_acumulada, sr.meta_individual, sr.mentora_id, sr.operador_id,
  ROUND(sr.venta_acumulada / NULLIF(SUM(sr.venta_acumulada) OVER (PARTITION BY sr.reto_id), 0) * 100, 2) AS pct_del_total,
  ROUND(SUM(sr.venta_acumulada) OVER (PARTITION BY sr.reto_id ORDER BY sr.venta_acumulada DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) / NULLIF(SUM(sr.venta_acumulada) OVER (PARTITION BY sr.reto_id), 0) * 100, 2) AS pct_acumulado
FROM public.socias_reto sr;

CREATE OR REPLACE VIEW public.vista_pipeline_seguimiento AS
SELECT sr.id, sr.reto_id, sr.nombre, sr.id_socia,
  sr.venta_acumulada, sr.pct_avance, sr.graduacion_probable,
  sr.fase_seguimiento, sr.estado, sr.mentora_id, sr.operador_id
FROM public.socias_reto sr WHERE sr.estado = 'graduada';

CREATE OR REPLACE VIEW public.vista_cola_trabajo AS
SELECT ao.id, ao.reto_id, ao.socia_reto_id, ao.regla_id,
  ao.origen, ao.titulo, ao.contexto, ao.prioridad,
  ao.estado, ao.asignada_a, ao.created_at,
  ao.pospuesta_hasta, ao.veces_pospuesta,
  sr.nombre AS socia_nombre, sr.id_socia, sr.telefono AS socia_telefono,
  sr.estado AS socia_estado, sr.dias_sin_compra, sr.venta_acumulada
FROM public.acciones_operativas ao
LEFT JOIN public.socias_reto sr ON sr.id = ao.socia_reto_id
WHERE ao.estado IN ('pendiente', 'en_progreso');
