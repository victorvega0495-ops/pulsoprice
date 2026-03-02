import { supabase } from "@/integrations/supabase/client";

export function evaluateCondition(regla: any, socia: any): boolean {
  const evalSingle = (campo: string, op: string, valor: string): boolean => {
    let actual: any;
    switch (campo) {
      case "dias_sin_compra": actual = Number(socia.dias_sin_compra); break;
      case "pct_avance": actual = Number(socia.pct_avance); break;
      case "venta_acumulada": actual = Number(socia.venta_acumulada); break;
      case "venta_semanal": actual = Number(socia.venta_semanal); break;
      case "estado": actual = socia.estado; break;
      case "g_probable": actual = socia.graduacion_probable; break;
      case "primera_compra":
        return valor === "true" ? Number(socia.venta_acumulada) > 0 && Number(socia.venta_acumulada) === Number(socia.venta_semanal) : false;
      case "crediprice_activo":
        return valor === "true" ? socia.crediprice_activo === true : socia.crediprice_activo === false;
      default: return false;
    }
    const numVal = Number(valor);
    const isNum = !isNaN(numVal) && !isNaN(actual);
    switch (op) {
      case ">=": return isNum ? actual >= numVal : false;
      case "<=": return isNum ? actual <= numVal : false;
      case ">": return isNum ? actual > numVal : false;
      case "<": return isNum ? actual < numVal : false;
      case "=": return isNum ? actual === numVal : String(actual) === valor;
      default: return false;
    }
  };

  const result1 = evalSingle(regla.campo, regla.operador, regla.valor);
  if (!regla.condicion_extra || !regla.campo2) return result1;
  const result2 = evalSingle(regla.campo2, regla.operador2, regla.valor2);
  return regla.logica_extra === "OR" ? result1 || result2 : result1 && result2;
}

function interpolateMessage(template: string, socia: any): string {
  return (template || "")
    .replace(/\{nombre\}/g, socia.nombre)
    .replace(/\{dias_sin_compra\}/g, String(socia.dias_sin_compra))
    .replace(/\{pct_avance\}/g, String(Number(socia.pct_avance).toFixed(1)))
    .replace(/\{venta_semanal\}/g, String(Number(socia.venta_semanal).toLocaleString()))
    .replace(/\{venta_acumulada\}/g, String(Number(socia.venta_acumulada).toLocaleString()));
}

/**
 * Generate actions for a single rule against a list of socias.
 * Returns the number of actions created.
 */
export async function generateActionsForRule(
  regla: any,
  retoId: string,
  socias: any[],
  fallbackAuthId: string,
): Promise<number> {
  // Build lookup: usuarios.id → auth_id
  const { data: todosUsuarios } = await supabase
    .from("usuarios").select("id, auth_id, rol").eq("activo", true);
  const idToAuth: Record<string, string> = {};
  let gerenteAuthId = fallbackAuthId;
  for (const u of (todosUsuarios || [])) {
    idToAuth[u.id] = u.auth_id;
    if (u.rol === "gerente") gerenteAuthId = u.auth_id;
  }

  let created = 0;
  for (const soc of socias) {
    if (!evaluateCondition(regla, soc)) continue;

    // Check for existing pending action from this rule for this socia
    const { data: existing } = await supabase
      .from("acciones_operativas").select("id")
      .eq("regla_id", regla.id).eq("socia_reto_id", soc.id)
      .in("estado", ["pendiente", "en_progreso"]).limit(1);
    if (existing && existing.length > 0) continue;

    // Resolve assignee
    let asignadaA = gerenteAuthId;
    if (regla.asignar_a_rol === "coordinador" && soc.coordinador_id && idToAuth[soc.coordinador_id]) {
      asignadaA = idToAuth[soc.coordinador_id];
    } else if (regla.asignar_a_rol === "desarrolladora" && soc.desarrolladora_id && idToAuth[soc.desarrolladora_id]) {
      asignadaA = idToAuth[soc.desarrolladora_id];
    } else if (regla.asignar_a_rol === "mentora" && soc.mentora_id && idToAuth[soc.mentora_id]) {
      asignadaA = idToAuth[soc.mentora_id];
    } else if (regla.asignar_a_rol === "gerente") {
      asignadaA = gerenteAuthId;
    }

    const mensaje = interpolateMessage(regla.accion_mensaje, soc);
    const { error } = await supabase.from("acciones_operativas").insert({
      reto_id: retoId, socia_reto_id: soc.id, asignada_a: asignadaA,
      tipo: regla.accion_tipo, titulo: regla.nombre, contexto: mensaje,
      origen: "metodo", prioridad: regla.prioridad, estado: "pendiente", regla_id: regla.id,
    });
    if (!error) created++;
  }
  return created;
}

/**
 * Count how many socias currently match a rule's condition.
 */
export function countMatchingSocias(regla: any, socias: any[]): number {
  return socias.filter((s) => evaluateCondition(regla, s)).length;
}
