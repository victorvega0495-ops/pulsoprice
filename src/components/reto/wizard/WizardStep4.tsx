import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, FileX } from "lucide-react";
import type { RetoFormData } from "../RetoWizard";

interface Props {
  form: RetoFormData;
  setForm: (f: RetoFormData) => void;
}

const DIA_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function WizardStep4({ form, setForm }: Props) {
  const [reglasDecision, setReglasDecision] = useState<"none" | "duplicate" | "scratch">("none");

  const { data: lastReto } = useQuery({
    queryKey: ["ultimo-reto-cerrado"],
    queryFn: async () => {
      const { data } = await supabase
        .from("retos")
        .select("id, nombre, pesos_semanales, pesos_diarios")
        .eq("estado", "cerrado")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: reglasCount = 0 } = useQuery({
    queryKey: ["reglas-ultimo-reto", lastReto?.id],
    enabled: !!lastReto?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("reglas_metodo")
        .select("id", { count: "exact", head: true })
        .eq("reto_id", lastReto!.id);
      return count || 0;
    },
  });

  const totalSemanal = form.pesos_semanales.reduce((a, b) => a + b, 0);
  const totalDiario = form.pesos_diarios.reduce((a, b) => a + b, 0);

  const updatePesoSemanal = (idx: number, val: number) => {
    const next = [...form.pesos_semanales];
    next[idx] = val;
    setForm({ ...form, pesos_semanales: next });
  };

  const updatePesoDiario = (idx: number, val: number) => {
    const next = [...form.pesos_diarios];
    next[idx] = val;
    setForm({ ...form, pesos_diarios: next });
  };

  const duplicarReglas = () => {
    if (lastReto) {
      const pesos = Array.isArray(lastReto.pesos_semanales)
        ? (lastReto.pesos_semanales as number[])
        : form.pesos_semanales;
      const diarios = Array.isArray(lastReto.pesos_diarios)
        ? (lastReto.pesos_diarios as number[])
        : form.pesos_diarios;
      setForm({ ...form, pesos_semanales: pesos, pesos_diarios: diarios, duplicar_reglas: true, reglas_reto_origen_id: lastReto.id });
      setReglasDecision("duplicate");
    }
  };

  const empezarDeCero = () => {
    setForm({ ...form, duplicar_reglas: false, reglas_reto_origen_id: undefined });
    setReglasDecision("scratch");
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Rules decision */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Reglas del Método</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Define las reglas que generarán acciones automáticas durante el reto.
        </p>

        {reglasDecision === "none" && (
          <div className="flex gap-3">
            {lastReto && (
              <Button variant="outline" onClick={duplicarReglas}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicar de "{lastReto.nombre}" ({reglasCount} reglas)
              </Button>
            )}
            <Button variant="outline" onClick={empezarDeCero}>
              <FileX className="mr-2 h-4 w-4" />
              Empezar de cero
            </Button>
          </div>
        )}

        {reglasDecision === "duplicate" && (
          <p className="text-sm text-emerald-400 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            ✓ Se copiarán {reglasCount} reglas de "{lastReto?.nombre}" al publicar el reto.
          </p>
        )}

        {reglasDecision === "scratch" && (
          <p className="text-sm text-muted-foreground rounded-lg border p-3 bg-secondary/50">
            Sin reglas predefinidas. Podrás agregarlas desde Reglas del Método después de publicar.
          </p>
        )}
      </div>

      {/* Weekly weights */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Pesos semanales</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Porcentaje de la meta por semana. Deben sumar 100%.
        </p>
        <div className="grid grid-cols-4 gap-4">
          {form.pesos_semanales.map((peso, i) => (
            <div key={i} className="space-y-2">
              <Label>S{i + 1}</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={peso}
                  onChange={(e) => updatePesoSemanal(i, Number(e.target.value))}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
        <p className={`mt-2 text-sm font-medium ${totalSemanal === 100 ? "text-emerald-400" : "text-destructive"}`}>
          Total: {totalSemanal}% {totalSemanal === 100 ? "✓" : "(debe ser 100%)"}
        </p>
      </div>

      {/* Daily weights */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Pesos diarios</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Distribución por día de semana para Meta × Día. Deben sumar 100%.
        </p>
        <div className="grid grid-cols-7 gap-3">
          {form.pesos_diarios.map((peso, i) => (
            <div key={i} className="space-y-2">
              <Label className="text-xs">{DIA_LABELS[i]}</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={peso}
                  onChange={(e) => updatePesoDiario(i, Number(e.target.value))}
                  className="pr-7 text-sm"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
        <p className={`mt-2 text-sm font-medium ${totalDiario === 100 ? "text-emerald-400" : "text-destructive"}`}>
          Total: {totalDiario}% {totalDiario === 100 ? "✓" : "(debe ser 100%)"}
        </p>
      </div>
    </div>
  );
}
