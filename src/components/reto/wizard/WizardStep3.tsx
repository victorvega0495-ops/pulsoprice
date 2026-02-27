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

  const autoAssign = (field: "coordinador_id" | "desarrolladora_id", users: any[]) => {
    if (users.length === 0) return;
    const tiendas = [...new Set(validSocias.map((s) => s.tienda_visita))];
    const updated = [...form.socias];
    let idx = 0;
    tiendas.forEach((tienda) => {
      updated.filter((s) => s.tienda_visita === tienda && !s.error).forEach((s) => {
        (s as any)[field] = users[idx % users.length].id;
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

  const countBy = (field: string, id: string) =>
    form.socias.filter((s) => !s.error && (s as any)[field] === id).length;

  const sinCoordinador = validSocias.filter((s) => !s.coordinador_id).length;
  const sinDesarrolladora = validSocias.filter((s) => !s.desarrolladora_id).length;
  const sinMentora = validSocias.filter((s) => !s.mentora_id).length;

  return (
    <div className="space-y-8">
      {/* Coordinadores */}
      <Section
        title="Coordinadores"
        users={coordinadores}
        emptyMsg="No hay coordinadores activos"
        countFn={(id) => countBy("coordinador_id", id)}
        sinAsignar={sinCoordinador}
        sinLabel="socias sin coordinador"
        onAutoAssign={() => autoAssign("coordinador_id", coordinadores)}
      />

      {/* Desarrolladoras */}
      <Section
        title="Desarrolladoras"
        users={desarrolladoras}
        emptyMsg="No hay desarrolladoras activas"
        countFn={(id) => countBy("desarrolladora_id", id)}
        sinAsignar={sinDesarrolladora}
        sinLabel="socias sin desarrolladora"
        onAutoAssign={() => autoAssign("desarrolladora_id", desarrolladoras)}
        badgeClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
      />

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
            {mentoras.map((m: any) => {
              const count = countBy("mentora_id", m.id);
              return (
                <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{m.nombre}</p>
                    <p className="text-xs text-muted-foreground">{m.telefono}</p>
                  </div>
                  <Badge variant="outline" className={count > 15 ? "border-destructive text-destructive" : ""}>
                    {count} socias
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {sinMentora > 0 && (
          <Warning count={sinMentora} label="socias sin mentora asignada" />
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

function Section({ title, users, emptyMsg, countFn, sinAsignar, sinLabel, onAutoAssign, badgeClass }: {
  title: string;
  users: any[];
  emptyMsg: string;
  countFn: (id: string) => number;
  sinAsignar: number;
  sinLabel: string;
  onAutoAssign: () => void;
  badgeClass?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Button variant="outline" size="sm" onClick={onAutoAssign} disabled={users.length === 0}>
          <Shuffle className="mr-2 h-4 w-4" />
          Asignar automáticamente
        </Button>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMsg}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{u.nombre}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <Badge variant="outline" className={badgeClass}>{countFn(u.id)} socias</Badge>
            </div>
          ))}
        </div>
      )}

      {sinAsignar > 0 && <Warning count={sinAsignar} label={sinLabel} />}
    </div>
  );
}

function Warning({ count, label }: { count: number; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-yellow-400">
      <AlertTriangle className="h-4 w-4" />
      {count} {label}
    </div>
  );
}
