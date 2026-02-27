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
  const { data: coordinadores = [] } = useQuery({
    queryKey: ["coordinadores-activos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("usuarios")
        .select("*")
        .eq("activo", true)
        .eq("rol", "coordinador");
      return data || [];
    },
  });

  const { data: desarrolladoras = [] } = useQuery({
    queryKey: ["desarrolladoras-activas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("usuarios")
        .select("*")
        .eq("activo", true)
        .eq("rol", "desarrolladora");
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

  const autoAssignCoordinadores = () => {
    if (coordinadores.length === 0) return;
    const tiendas = [...new Set(validSocias.map((s) => s.tienda_visita))];
    const updated = [...form.socias];
    let idx = 0;
    tiendas.forEach((tienda) => {
      updated.filter((s) => s.tienda_visita === tienda && !s.error).forEach((s) => {
        s.operador_id = coordinadores[idx % coordinadores.length].id;
      });
      idx++;
    });
    setForm({ ...form, socias: updated });
  };

  const autoAssignMentoras = () => {
    if (mentoras.length === 0) return;
    const updated = [...form.socias];
    updated.filter((s) => !s.error).forEach((s, i) => {
      s.mentora_id = mentoras[i % mentoras.length].id;
    });
    setForm({ ...form, socias: updated });
  };

  const countByCoord = (id: string) => form.socias.filter((s) => s.operador_id === id && !s.error).length;
  const countByMentora = (id: string) => form.socias.filter((s) => s.mentora_id === id && !s.error).length;
  const sinCoordinador = validSocias.filter((s) => !s.operador_id).length;
  const sinMentora = validSocias.filter((s) => !s.mentora_id).length;

  return (
    <div className="space-y-8">
      {/* Coordinadores */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Coordinadores</h3>
          <Button variant="outline" size="sm" onClick={autoAssignCoordinadores} disabled={coordinadores.length === 0}>
            <Shuffle className="mr-2 h-4 w-4" />
            Asignar automáticamente
          </Button>
        </div>

        {coordinadores.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay coordinadores activos</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {coordinadores.map((op: any) => (
              <div key={op.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{op.nombre}</p>
                  <p className="text-xs text-muted-foreground">{op.email}</p>
                </div>
                <Badge variant="outline">{countByCoord(op.id)} socias</Badge>
              </div>
            ))}
          </div>
        )}

        {sinCoordinador > 0 && (
          <div className="flex items-center gap-2 text-sm text-yellow-400">
            <AlertTriangle className="h-4 w-4" />
            {sinCoordinador} socias sin coordinador asignado
          </div>
        )}
      </div>

      {/* Desarrolladoras info */}
      {desarrolladoras.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Desarrolladoras disponibles</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {desarrolladoras.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{d.nombre}</p>
                  <p className="text-xs text-muted-foreground">{d.email}</p>
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Desarrolladora</Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Las desarrolladoras se asignan después de publicar el reto</p>
        </div>
      )}

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
