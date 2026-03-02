
CREATE TABLE public.agenda_metodo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reto_id UUID REFERENCES retos(id) ON DELETE CASCADE NOT NULL,
  dia_numero INT NOT NULL,
  semana INT NOT NULL,
  dia_semana TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  actividades JSONB,
  tarea_socia TEXT,
  rol_coordinador TEXT,
  rol_desarrolladora TEXT,
  rol_mentora TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agenda_metodo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read agenda_metodo"
ON public.agenda_metodo FOR SELECT
USING (true);

CREATE POLICY "Directors/gerentes can insert agenda_metodo"
ON public.agenda_metodo FOR INSERT
WITH CHECK (is_director_or_gerente(auth.uid()));

CREATE POLICY "Directors/gerentes can update agenda_metodo"
ON public.agenda_metodo FOR UPDATE
USING (is_director_or_gerente(auth.uid()));

CREATE POLICY "Directors/gerentes can delete agenda_metodo"
ON public.agenda_metodo FOR DELETE
USING (is_director_or_gerente(auth.uid()));
