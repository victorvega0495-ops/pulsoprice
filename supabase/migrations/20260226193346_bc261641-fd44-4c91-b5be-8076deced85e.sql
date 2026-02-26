
-- Table: acciones_operativas
CREATE TABLE public.acciones_operativas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reto_id UUID NOT NULL REFERENCES public.retos(id),
  socia_reto_id UUID NOT NULL REFERENCES public.socias_reto(id),
  asignada_a UUID NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'metodo',
  origen TEXT NOT NULL DEFAULT 'MÉTODO',
  titulo TEXT NOT NULL,
  contexto TEXT,
  prioridad TEXT NOT NULL DEFAULT 'media',
  estado TEXT NOT NULL DEFAULT 'pendiente',
  resultado TEXT,
  comentario_resultado TEXT,
  fecha_completada TIMESTAMP WITH TIME ZONE,
  pospuesta_hasta TIMESTAMP WITH TIME ZONE,
  veces_pospuesta INTEGER NOT NULL DEFAULT 0,
  escalada_a UUID,
  razon_escalamiento TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.acciones_operativas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read acciones_operativas"
  ON public.acciones_operativas FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert acciones_operativas"
  ON public.acciones_operativas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update acciones_operativas"
  ON public.acciones_operativas FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Table: interacciones
CREATE TABLE public.interacciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reto_id UUID NOT NULL REFERENCES public.retos(id),
  socia_reto_id UUID NOT NULL REFERENCES public.socias_reto(id),
  accion_id UUID REFERENCES public.acciones_operativas(id),
  usuario_id UUID NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'nota',
  comentario TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.interacciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read interacciones"
  ON public.interacciones FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert interacciones"
  ON public.interacciones FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger for updated_at on acciones_operativas
CREATE TRIGGER update_acciones_operativas_updated_at
  BEFORE UPDATE ON public.acciones_operativas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
