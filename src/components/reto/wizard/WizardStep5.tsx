import { useState } from "react";
import { format, eachDayOfInterval, differenceInDays, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Rocket, AlertTriangle } from "lucide-react";
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
  const coordinadorIds = [...new Set(validSocias.map((s) => s.coordinador_id).filter(Boolean))];
  const desarrolladoraIds = [...new Set(validSocias.map((s) => s.desarrolladora_id).filter(Boolean))];
  const mentoraIds = [...new Set(validSocias.map((s) => s.mentora_id).filter(Boolean))];

  const sinCoordinador = validSocias.filter((s) => !s.coordinador_id).length;
  const sinDesarrolladora = validSocias.filter((s) => !s.desarrolladora_id).length;
  const sinMentora = validSocias.filter((s) => !s.mentora_id).length;

  const pesosSemanalOk = form.pesos_semanales.reduce((a, b) => a + b, 0) === 100;
  const pesosDiarioOk = form.pesos_diarios.reduce((a, b) => a + b, 0) === 100;
  const fechasOk = form.fecha_inicio && form.fecha_fin &&
    differenceInDays(form.fecha_fin, form.fecha_inicio) >= 28;

  const checks = [
    { ok: sinCoordinador === 0, label: "Todas las socias tienen coordinador" },
    { ok: sinDesarrolladora === 0, label: "Todas las socias tienen desarrolladora" },
    { ok: sinMentora === 0, label: "Todas las socias tienen mentora" },
    { ok: pesosSemanalOk, label: "Pesos semanales suman 100%" },
    { ok: pesosDiarioOk, label: "Pesos diarios suman 100%" },
    { ok: !!fechasOk, label: "Fechas válidas (mín. 28 días)" },
  ];

  const allOk = checks.every((c) => c.ok);

  const metaTotal = validSocias.reduce((sum, s) =>
    sum + (s.meta_individual ?? form.meta_estandar), 0);

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
          tipo_reto: form.tipo_reto || "operacion",
          estado: "publicado" as any,
          pesos_semanales: form.pesos_semanales,
          pesos_diarios: form.pesos_diarios,
          tiendas: form.tiendas.length > 0 ? form.tiendas : null,
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
        meta_individual: s.meta_individual ?? form.meta_estandar,
        coordinador_id: s.coordinador_id || null,
        desarrolladora_id: s.desarrolladora_id || null,
        operador_id: s.coordinador_id || null,
        mentora_id: s.mentora_id || null,
        estado: "inscrita" as any,
      }));

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
        let cumPct = 0;
        for (let w = 0; w < weekIndex; w++) {
          cumPct += form.pesos_semanales[w];
        }
        const daysInThisWeek = weekIndex < 3 ? daysPerWeek : totalDays - daysPerWeek * 3;
        const dayInWeek = i - weekIndex * daysPerWeek;

        // Apply daily weight distribution
        const dayOfWeek = getDay(day); // 0=Sun, 1=Mon...
        const adjustedDayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0=Mon...6=Sun
        const dailyWeight = form.pesos_diarios[adjustedDayIdx];

        cumPct += (form.pesos_semanales[weekIndex] * (dayInWeek + 1)) / daysInThisWeek;

        return {
          reto_id: reto.id,
          fecha: format(day, "yyyy-MM-dd"),
          dia_numero: i + 1,
          semana: weekIndex + 1,
          meta_acumulada_pct: Math.round(cumPct * 100) / 100,
          meta_acumulada_valor: Math.round((cumPct / 100) * metaTotal),
          venta_real: 0,
        };
      });

      for (let i = 0; i < metaRows.length; i += 500) {
        const chunk = metaRows.slice(i, i + 500);
        const { error } = await supabase.from("metas_diarias_reto").insert(chunk);
        if (error) throw error;
      }

      // 4. Duplicate rules if requested
      if (form.duplicar_reglas && form.reglas_reto_origen_id) {
        const { data: reglas } = await supabase
          .from("reglas_metodo")
          .select("*")
          .eq("reto_id", form.reglas_reto_origen_id);

        if (reglas && reglas.length > 0) {
          const newReglas = reglas.map(({ id, reto_id, created_at, updated_at, ...rest }) => ({
            ...rest,
            reto_id: reto.id,
          }));
          const { error } = await supabase.from("reglas_metodo").insert(newReglas);
          if (error) throw error;
        }
      }

      // 5. Generate initial score_mentoras
      const uniqueMentoras = [...new Set(validSocias.map((s) => s.mentora_id).filter(Boolean))];
      if (uniqueMentoras.length > 0) {
        const scores = uniqueMentoras.map((mid) => ({
          reto_id: reto.id,
          mentora_id: mid!,
          semana: 0,
          score_ponderado: 0,
          distribucion_socias: { con_compra: 0, en_riesgo: 0, inactivas: 0 },
        }));
        await supabase.from("score_mentoras").insert(scores);
      }

      toast({ title: "¡Reto publicado!", description: `${form.nombre} con ${validSocias.length} socias` });
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
            ? `${format(form.fecha_inicio, "d MMM", { locale: es })} — ${format(form.fecha_fin, "d MMM yyyy", { locale: es })} (${differenceInDays(form.fecha_fin, form.fecha_inicio)} días)`
            : "—"}
        />
        <SummaryCard label="Socias" value={String(validSocias.length)} />
        <SummaryCard label="Meta estándar" value={`$${form.meta_estandar.toLocaleString()}`} />
        <SummaryCard label="Meta total reto" value={`$${metaTotal.toLocaleString()}`} />
        <SummaryCard label="Coordinadores" value={String(coordinadorIds.length)} />
        <SummaryCard label="Desarrolladoras" value={String(desarrolladoraIds.length)} />
        <SummaryCard label="Mentoras" value={String(mentoraIds.length)} />
        <SummaryCard
          label="Pesos semanales"
          value={form.pesos_semanales.map((p, i) => `S${i + 1}: ${p}%`).join(" · ")}
        />
        <SummaryCard label="Reglas" value={form.duplicar_reglas ? "Duplicadas del reto anterior" : "Sin reglas (agregar post-publicación)"} />
      </div>

      {/* Checklist */}
      <div className="space-y-2 rounded-lg border p-4">
        <h4 className="text-sm font-semibold mb-3">Validación</h4>
        {checks.map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            {c.ok ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            <span className={c.ok ? "text-foreground" : "text-destructive"}>{c.label}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-4">
        <Button size="lg" onClick={() => setConfirmOpen(true)} disabled={!allOk}>
          <Rocket className="mr-2 h-5 w-5" />
          Publicar Reto
        </Button>
        {!allOk && (
          <p className="ml-4 self-center text-sm text-destructive">
            Corrige los errores antes de publicar
          </p>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Publicar reto?</DialogTitle>
            <DialogDescription>
              Esto creará {validSocias.length} registros de socias, calculará metas diarias y activará el motor de reglas.
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
