import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { RetoFormData } from "../RetoWizard";

interface Props {
  form: RetoFormData;
  setForm: (f: RetoFormData) => void;
}

export function WizardStep1({ form, setForm }: Props) {
  return (
    <div className="space-y-6 max-w-lg">
      <div className="space-y-2">
        <Label>Nombre del reto</Label>
        <Input
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          placeholder="Ej: Reto Mar-Abr 2026"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fecha inicio</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.fecha_inicio && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {form.fecha_inicio ? format(form.fecha_inicio, "PPP", { locale: es }) : "Seleccionar"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={form.fecha_inicio}
                onSelect={(d) => setForm({
                  ...form,
                  fecha_inicio: d,
                  fecha_fin: d ? addDays(d, 28) : form.fecha_fin,
                })}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Fecha fin</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.fecha_fin && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {form.fecha_fin ? format(form.fecha_fin, "PPP", { locale: es }) : "Seleccionar"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={form.fecha_fin}
                onSelect={(d) => setForm({ ...form, fecha_fin: d })}
                disabled={(date) =>
                  form.fecha_inicio ? date < addDays(form.fecha_inicio, 28) : false
                }
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Meta estándar ($)</Label>
        <Input
          type="number"
          value={form.meta_estandar}
          onChange={(e) => setForm({ ...form, meta_estandar: Number(e.target.value) })}
        />
      </div>

      <div className="space-y-2">
        <Label>Tipo de meta</Label>
        <RadioGroup
          value={form.tipo_meta}
          onValueChange={(v) => setForm({ ...form, tipo_meta: v as "estandar" | "personalizada" })}
          className="flex gap-4"
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="estandar" />
            <span className="text-sm">Estándar para todas</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="personalizada" />
            <span className="text-sm">Personalizada por socia</span>
          </label>
        </RadioGroup>
      </div>
    </div>
  );
}
