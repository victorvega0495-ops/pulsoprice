import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RetoFormData } from "../RetoWizard";

interface Props {
  form: RetoFormData;
  setForm: (f: RetoFormData) => void;
}

const DIA_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function WizardStep4({ form, setForm }: Props) {
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

  return (
    <div className="space-y-8 max-w-2xl">
      <h3 className="text-lg font-semibold mb-1">Configuración de Metas</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Define la distribución de metas por semana y por día.
      </p>

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
