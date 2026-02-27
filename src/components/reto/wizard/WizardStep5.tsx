import { useState } from "react";
import { format, eachDayOfInterval, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { RetoFormData } from "../RetoWizard";

interface Props {
  form: RetoFormData;
  onPublished: () => void;
}

export function WizardStep5({ form, onPublished }: Props) {
  const { user } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const validSocias = form.socias.filter((s) => !s.error);
  const coordinadorIds = [...new Set(validSocias.map((s) => s.operador_id).filter(Boolean))];
  const mentoraIds = [...new Set(validSocias.map((s) => s.mentora_id).filter(Boolean))];

  const publish = async () => {
    if (!form.fecha_inicio || !form.fecha_fin || !user) return;
    setPublishing(true);

    try {
      // 1. Create reto
      const { data: reto, error: retoErr } = await supabase
        .from("retos")
        .insert({
          nombre: form.nombre,
          fecha_inicio: format(form.fecha_inicio, "yyyy-MM-dd"),
          fecha_fin: format(form.fecha_fin, "yyyy-MM-dd"),
          meta_estandar: form.meta_estandar,
          tipo_meta: form.tipo_meta,
          estado: "publicado" as any,
          pesos_semanales: form.pesos_semanales,
          created_by: user.id,
        })
        .select()
        .single();

      if (retoErr || !reto) throw retoErr || new Error("No se pudo crear el reto");

      // 2. Insert socias
      const sociaRows = validSocias.map((s) => ({
        reto_id: reto.id,
        id_socia: s.id_socia,
        nombre: s.nombre,
        telefono: s.telefono || null,
        tienda_visita: s.tienda_visita || null,
        baseline_mensual: s.baseline_mensual,
        meta_individual: form.tipo_meta === "estandar"
          ? form.meta_estandar
          : Math.round(s.baseline_mensual * 1.3), // 30% growth target
        operador_id: s.operador_id || null,
        mentora_id: s.mentora_id || null,
        estado: "inscrita" as any,
      }));

      // Batch insert in chunks of 500
      for (let i = 0; i < sociaRows.length; i += 500) {
        const chunk = sociaRows.slice(i, i + 500);
        const { error } = await supabase.from("socias_reto").insert(chunk);
        if (error) throw error;
      }

      // 3. Create metas_diarias_reto
      const days = eachDayOfInterval({ start: form.fecha_inicio, end: form.fecha_fin });
      const totalDays = days.length;
      const daysPerWeek = Math.ceil(totalDays / 4);

      const metaRows = days.map((day, i) => {
        const weekIndex = Math.min(Math.floor(i / daysPerWeek), 3);
        // Calculate cumulative percentage up to this day
        let cumPct = 0;
        for (let w = 0; w < weekIndex; w++) {
          cumPct += form.pesos_semanales[w];
        }
        const daysInThisWeek = weekIndex < 3 ? daysPerWeek : totalDays - daysPerWeek * 3;
        const dayInWeek = i - weekIndex * daysPerWeek;
        cumPct += (form.pesos_semanales[weekIndex] * (dayInWeek + 1)) / daysInThisWeek;

        return {
          reto_id: reto.id,
          fecha: format(day, "yyyy-MM-dd"),
          dia_numero: i + 1,
          semana: weekIndex + 1,
          meta_acumulada_pct: Math.round(cumPct * 100) / 100,
          meta_acumulada_valor: Math.round((cumPct / 100) * form.meta_estandar * validSocias.length),
          venta_real: 0,
        };
      });

      for (let i = 0; i < metaRows.length; i += 500) {
        const chunk = metaRows.slice(i, i + 500);
        const { error } = await supabase.from("metas_diarias_reto").insert(chunk);
        if (error) throw error;
      }

      toast({ title: "¡Reto publicado!", description: `${form.nombre} está activo con ${validSocias.length} socias` });
      onPublished();
    } catch (err: any) {
      toast({ title: "Error al publicar", description: err.message, variant: "destructive" });
    } finally {
      setPublishing(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Resumen del Reto</h3>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Nombre" value={form.nombre} />
        <SummaryCard
          label="Fechas"
          value={form.fecha_inicio && form.fecha_fin
            ? `${format(form.fecha_inicio, "d MMM", { locale: es })} — ${format(form.fecha_fin, "d MMM yyyy", { locale: es })}`
            : "—"}
        />
        <SummaryCard label="Meta" value={`$${form.meta_estandar.toLocaleString()} (${form.tipo_meta})`} />
        <SummaryCard label="Socias" value={String(validSocias.length)} />
        <SummaryCard label="Coordinadores" value={String(coordinadorIds.length)} />
        <SummaryCard label="Mentoras" value={String(mentoraIds.length)} />
        <SummaryCard
          label="Pesos semanales"
          value={form.pesos_semanales.map((p, i) => `S${i + 1}: ${p}%`).join(" · ")}
        />
      </div>

      <div className="flex justify-center pt-4">
        <Button size="lg" onClick={() => setConfirmOpen(true)}>
          <Rocket className="mr-2 h-5 w-5" />
          Publicar Reto
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Publicar reto?</DialogTitle>
            <DialogDescription>
              Esto creará los grupos y activará el motor de seguimiento. Esta acción no se puede deshacer fácilmente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Se insertarán {validSocias.length} socias y {form.fecha_inicio && form.fecha_fin ? differenceInDays(form.fecha_fin, form.fecha_inicio) + 1 : 0} registros de metas diarias.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={publish} disabled={publishing}>
              {publishing ? "Publicando..." : "Confirmar y Publicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
