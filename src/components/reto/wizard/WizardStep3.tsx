import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shuffle, AlertTriangle } from "lucide-react";
import type { RetoFormData } from "../RetoWizard";

interface Props {
  form: RetoFormData;
  setForm: (f: RetoFormData) => void;
}

export function WizardStep3({ form, setForm }: Props) {
  const { data: operadores = [] } = useQuery({
    queryKey: ["operadores-activos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("usuarios")
        .select("*")
        .eq("activo", true)
        .contains("modo_operativo", ["operacion"]);
      return data || [];
    },
  });

  const { data: mentoras = [] } = useQuery({
    queryKey: ["mentoras-activas"],
    queryFn: async () => {
      const { data } = await supabase.from("mentoras").select("*").eq("activa", true);
      return data || [];
    },
  });

  const validSocias = form.socias.filter((s) => !s.error);

  const autoAssignOperadores = () => {
    if (operadores.length === 0) return;
    // Group socias by tienda, distribute evenly
    const tiendas = [...new Set(validSocias.map((s) => s.tienda_visita))];
    const updated = [...form.socias];
    let opIdx = 0;

    tiendas.forEach((tienda) => {
      const sociasInTienda = updated.filter((s) => s.tienda_visita === tienda && !s.error);
      sociasInTienda.forEach((s) => {
        s.operador_id = operadores[opIdx % operadores.length].id;
      });
      opIdx++;
    });

    setForm({ ...form, socias: updated });
  };

  const autoAssignMentoras = () => {
    if (mentoras.length === 0) return;
    const updated = [...form.socias];
    const valid = updated.filter((s) => !s.error);
    valid.forEach((s, i) => {
      s.mentora_id = mentoras[i % mentoras.length].id;
    });
    setForm({ ...form, socias: updated });
  };

  const countByOp = (opId: string) => form.socias.filter((s) => s.operador_id === opId && !s.error).length;
  const countByMentora = (mId: string) => form.socias.filter((s) => s.mentora_id === mId && !s.error).length;
  const sinOperador = validSocias.filter((s) => !s.operador_id).length;
  const sinMentora = validSocias.filter((s) => !s.mentora_id).length;

  return (
    <div className="space-y-8">
      {/* Operadores */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Operadores</h3>
          <Button variant="outline" size="sm" onClick={autoAssignOperadores} disabled={operadores.length === 0}>
            <Shuffle className="mr-2 h-4 w-4" />
            Asignar automáticamente
          </Button>
        </div>

        {operadores.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay operadores con modo "operación" activos</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {operadores.map((op: any) => (
              <div key={op.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{op.nombre}</p>
                  <p className="text-xs text-muted-foreground">{op.email}</p>
                </div>
                <Badge variant="outline">{countByOp(op.id)} socias</Badge>
              </div>
            ))}
          </div>
        )}

        {sinOperador > 0 && (
          <div className="flex items-center gap-2 text-sm text-yellow-400">
            <AlertTriangle className="h-4 w-4" />
            {sinOperador} socias sin operador asignado
          </div>
        )}
      </div>

      {/* Mentoras */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Mentoras</h3>
          <Button variant="outline" size="sm" onClick={autoAssignMentoras} disabled={mentoras.length === 0}>
            <Shuffle className="mr-2 h-4 w-4" />
            Asignar automáticamente
          </Button>
        </div>

        {mentoras.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay mentoras activas</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mentoras.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{m.nombre}</p>
                  <p className="text-xs text-muted-foreground">{m.telefono}</p>
                </div>
                <Badge variant="outline">{countByMentora(m.id)} socias</Badge>
              </div>
            ))}
          </div>
        )}

        {sinMentora > 0 && (
          <div className="flex items-center gap-2 text-sm text-yellow-400">
            <AlertTriangle className="h-4 w-4" />
            {sinMentora} socias sin mentora asignada
          </div>
        )}

        {mentoras.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Ratio sugerido: 1 mentora por cada 10-15 socias (actual: ~{Math.round(validSocias.length / Math.max(mentoras.length, 1))} por mentora)
          </p>
        )}
      </div>
    </div>
  );
}
