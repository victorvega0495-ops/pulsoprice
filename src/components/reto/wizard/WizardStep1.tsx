import { format, addDays, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import type { RetoFormData } from "../RetoWizard";

interface Props {
  form: RetoFormData;
  setForm: (f: RetoFormData) => void;
}

export function WizardStep1({ form, setForm }: Props) {
  const { data: retosActivos = [] } = useQuery({
    queryKey: ["retos-activos-overlap"],
    queryFn: async () => {
      const { data } = await supabase
        .from("retos")
        .select("id, nombre, fecha_inicio, fecha_fin, estado")
        .in("estado", ["activo", "publicado"]);
      return data || [];
    },
  });

  const { data: tiendasDisponibles = [] } = useQuery({
    queryKey: ["tiendas-disponibles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("socias_reto")
        .select("tienda_visita");
      if (!data) return [];
      const unique = [...new Set(data.map((s) => s.tienda_visita).filter(Boolean))];
      return unique.sort() as string[];
    },
  });

  const diffDays = form.fecha_inicio && form.fecha_fin
    ? differenceInDays(form.fecha_fin, form.fecha_inicio)
    : 0;

  const hasOverlap = form.fecha_inicio && form.fecha_fin && retosActivos.some((r) => {
    const rStart = new Date(r.fecha_inicio);
    const rEnd = new Date(r.fecha_fin);
    return form.fecha_inicio! <= rEnd && form.fecha_fin! >= rStart;
  });

  const toggleTienda = (t: string) => {
    const next = form.tiendas.includes(t)
      ? form.tiendas.filter((x) => x !== t)
      : [...form.tiendas, t];
    setForm({ ...form, tiendas: next });
  };

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

      {form.fecha_inicio && form.fecha_fin && diffDays < 28 && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Mínimo 28 días entre inicio y fin (actual: {diffDays} días)
        </div>
      )}

      {hasOverlap && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Las fechas se solapan con un reto activo/publicado
        </div>
      )}

      {form.fecha_inicio && form.fecha_fin && diffDays >= 28 && (
        <p className="text-sm text-muted-foreground">Duración: {diffDays} días ({Math.ceil(diffDays / 7)} semanas)</p>
      )}

      {tiendasDisponibles.length > 0 && (
        <div className="space-y-2">
          <Label>Tiendas participantes</Label>
          <div className="flex flex-wrap gap-2">
            {tiendasDisponibles.map((t) => (
              <Badge
                key={t}
                variant={form.tiendas.includes(t) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTienda(t)}
              >
                {t}
              </Badge>
            ))}
          </div>
          {form.tiendas.length > 0 && (
            <p className="text-xs text-muted-foreground">{form.tiendas.length} tiendas seleccionadas</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Meta estándar ($)</Label>
        <Input
          type="number"
          value={form.meta_estandar}
          onChange={(e) => setForm({ ...form, meta_estandar: Number(e.target.value) })}
        />
      </div>

      <div className="space-y-2">
        <Label>Tipo de reto</Label>
        <RadioGroup
          value={form.tipo_reto || "operacion"}
          onValueChange={(v) => setForm({ ...form, tipo_reto: v as any })}
          className="flex gap-4"
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="operacion" />
            <span className="text-sm">Reto de Operación</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="seguimiento" />
            <span className="text-sm">Programa de Seguimiento</span>
          </label>
        </RadioGroup>
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
