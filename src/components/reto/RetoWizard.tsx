import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { WizardStep1 } from "./wizard/WizardStep1";
import { WizardStep2 } from "./wizard/WizardStep2";
import { WizardStep3 } from "./wizard/WizardStep3";
import { WizardStep4 } from "./wizard/WizardStep4";
import { WizardStep5 } from "./wizard/WizardStep5";

export interface SociaRow {
  id_socia: string;
  nombre: string;
  telefono: string;
  tienda_visita: string;
  baseline_mensual: number;
  meta_individual?: number;
  operador_id?: string;
  coordinador_id?: string;
  desarrolladora_id?: string;
  mentora_id?: string;
  error?: string;
}

export interface RetoFormData {
  nombre: string;
  fecha_inicio: Date | undefined;
  fecha_fin: Date | undefined;
  meta_estandar: number;
  tipo_meta: "estandar" | "personalizada";
  tiendas: string[];
  socias: SociaRow[];
  pesos_semanales: number[];
  pesos_diarios: number[];
  duplicar_reglas: boolean;
  reglas_reto_origen_id?: string;
}

const stepLabels = ["Datos básicos", "Socias", "Equipo", "Método", "Publicar"];

interface Props {
  onClose: () => void;
  onPublished: () => void;
}

export function RetoWizard({ onClose, onPublished }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RetoFormData>({
    nombre: "",
    fecha_inicio: undefined,
    fecha_fin: undefined,
    meta_estandar: 38000,
    tipo_meta: "estandar",
    tiendas: [],
    socias: [],
    pesos_semanales: [15, 25, 30, 30],
    pesos_diarios: [15, 15, 15, 15, 20, 15, 5],
    duplicar_reglas: false,
  });

  const canNext = (): boolean => {
    switch (step) {
      case 0: {
        if (!form.nombre || !form.fecha_inicio || !form.fecha_fin) return false;
        const diffMs = form.fecha_fin.getTime() - form.fecha_inicio.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= 28;
      }
      case 1:
        return form.socias.filter((s) => !s.error).length > 0;
      case 2:
        return true; // warnings shown but not blocking
      case 3:
        return (
          form.pesos_semanales.reduce((a, b) => a + b, 0) === 100 &&
          form.pesos_diarios.reduce((a, b) => a + b, 0) === 100
        );
      default:
        return true;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Crear Nuevo Reto</h1>
          <p className="text-sm text-muted-foreground">Paso {step + 1} de 5 — {stepLabels[step]}</p>
        </div>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
      </div>

      <div className="flex gap-1">
        {stepLabels.map((label, i) => (
          <div key={i} className="flex-1">
            <div className={`h-1.5 rounded-full transition-colors ${
              i <= step ? "bg-primary" : "bg-secondary"
            }`} />
            <p className={`mt-1 text-xs ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-6">
        {step === 0 && <WizardStep1 form={form} setForm={setForm} />}
        {step === 1 && <WizardStep2 form={form} setForm={setForm} />}
        {step === 2 && <WizardStep3 form={form} setForm={setForm} />}
        {step === 3 && <WizardStep4 form={form} setForm={setForm} />}
        {step === 4 && <WizardStep5 form={form} onPublished={onPublished} />}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : onClose()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {step === 0 ? "Cancelar" : "Anterior"}
        </Button>
        {step < 4 && (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
            Siguiente
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
