import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import type { RetoFormData } from "../RetoWizard";

interface Props {
  form: RetoFormData;
  setForm: (f: RetoFormData) => void;
}

export function WizardStep4({ form, setForm }: Props) {
  const { data: lastReto } = useQuery({
    queryKey: ["ultimo-reto-cerrado"],
    queryFn: async () => {
      const { data } = await supabase
        .from("retos")
        .select("nombre, pesos_semanales")
        .eq("estado", "cerrado")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const total = form.pesos_semanales.reduce((a, b) => a + b, 0);
  const isValid = total === 100;

  const updatePeso = (idx: number, val: number) => {
    const next = [...form.pesos_semanales];
    next[idx] = val;
    setForm({ ...form, pesos_semanales: next });
  };

  const duplicar = () => {
    if (lastReto?.pesos_semanales) {
      const pesos = lastReto.pesos_semanales as number[];
      setForm({ ...form, pesos_semanales: pesos });
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h3 className="text-lg font-semibold mb-1">Pesos semanales</h3>
        <p className="text-sm text-muted-foreground">
          Define qué porcentaje de la meta se espera alcanzar cada semana. Deben sumar 100%.
        </p>
      </div>

      {lastReto && (
        <Button variant="outline" onClick={duplicar}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicar reglas de "{lastReto.nombre}"
        </Button>
      )}

      {!lastReto && (
        <p className="text-sm text-muted-foreground rounded-lg border p-3 bg-secondary/50">
          No hay retos anteriores. Se usarán los pesos por defecto.
        </p>
      )}

      <div className="grid grid-cols-4 gap-4">
        {form.pesos_semanales.map((peso, i) => (
          <div key={i} className="space-y-2">
            <Label>Semana {i + 1}</Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                value={peso}
                onChange={(e) => updatePeso(i, Number(e.target.value))}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </div>
        ))}
      </div>

      <div className={`text-sm font-medium ${isValid ? "text-emerald-400" : "text-destructive"}`}>
        Total: {total}% {isValid ? "✓" : "(debe ser 100%)"}
      </div>
    </div>
  );
}
