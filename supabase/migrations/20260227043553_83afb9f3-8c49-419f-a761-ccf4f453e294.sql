
CREATE OR REPLACE FUNCTION public.delete_reto_cascade(p_reto_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM analisis_ia WHERE reto_id = p_reto_id;
  DELETE FROM items_llamada WHERE lista_id IN (SELECT id FROM listas_llamadas WHERE reto_id = p_reto_id);
  DELETE FROM listas_llamadas WHERE reto_id = p_reto_id;
  DELETE FROM acciones_operativas WHERE reto_id = p_reto_id;
  DELETE FROM alertas WHERE reto_id = p_reto_id;
  DELETE FROM interacciones WHERE reto_id = p_reto_id;
  DELETE FROM score_mentoras WHERE reto_id = p_reto_id;
  DELETE FROM compromisos_mentora WHERE reto_id = p_reto_id;
  DELETE FROM ventas_diarias WHERE reto_id = p_reto_id;
  DELETE FROM metas_diarias_reto WHERE reto_id = p_reto_id;
  DELETE FROM cargas_ventas WHERE reto_id = p_reto_id;
  DELETE FROM socias_reto WHERE reto_id = p_reto_id;
  DELETE FROM reglas_metodo WHERE reto_id = p_reto_id;
  DELETE FROM activaciones WHERE reto_id = p_reto_id;
  DELETE FROM retos WHERE id = p_reto_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
