import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingUp, Target, Users } from "lucide-react";

export default function DashboardEjecutivo() {
  // All retos
  const { data: retos = [], isLoading } = useQuery({
    queryKey: ["all-retos"],
    queryFn: async () => {
      const { data } = await supabase.from("retos").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const retoActivo = retos.find(r => r.estado === "publicado");

  // All socias for current year retos
  const { data: allSocias = [] } = useQuery({
    queryKey: ["all-socias-exec"],
    queryFn: async () => {
      const { data } = await supabase.from("socias_reto").select("*");
      return data || [];
    },
  });

  // Acciones escaladas / criticas
  const { data: alertas = [] } = useQuery({
    queryKey: ["alertas-criticas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("acciones_operativas").select("*, socias_reto(nombre)")
        .in("prioridad", ["urgente"])
        .neq("estado", "completada")
        .order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // KPI 1: Diferencial acumulado 2026
  const sociasCurrYear = allSocias; // All socias across all retos
  const diferencial = sociasCurrYear.reduce((s, x) => s + (Number(x.venta_acumulada || 0) - Number(x.baseline_mensual || 0)), 0);

  // KPI 2: G distribution from active reto
  const socasReto = retoActivo ? allSocias.filter(s => s.reto_id === retoActivo.id) : [];
  const totalSocias = socasReto.length;
  const g1 = socasReto.filter(s => s.graduacion_probable === "G1").length;
  const g2 = socasReto.filter(s => s.graduacion_probable === "G2").length;
  const g3 = socasReto.filter(s => s.graduacion_probable === "G3").length;
  const g1Pct = totalSocias > 0 ? (g1 / totalSocias) * 100 : 0;
  const g2Pct = totalSocias > 0 ? (g2 / totalSocias) * 100 : 0;
  const g3Pct = totalSocias > 0 ? (g3 / totalSocias) * 100 : 0;

  // KPI 3: Reto activo info
  let semanaActual = 0;
  let pctAvanceGlobal = 0;
  if (retoActivo) {
    const inicio = parseISO(retoActivo.fecha_inicio);
    const fin = parseISO(retoActivo.fecha_fin);
    const totalDias = differenceInDays(fin, inicio) + 1;
    const diaActual = Math.min(differenceInDays(new Date(), inicio) + 1, totalDias);
    semanaActual = Math.min(Math.ceil((diaActual / totalDias) * 4), 4);
    const venta = socasReto.reduce((s, x) => s + Number(x.venta_acumulada || 0), 0);
    const meta = socasReto.reduce((s, x) => s + Number(x.meta_individual || 0), 0);
    pctAvanceGlobal = meta > 0 ? (venta / meta) * 100 : 0;
  }

  // KPI 4: Graduadas
  const graduadas = allSocias.filter(s => s.estado === "graduada");
  const sostenidas = graduadas.filter(s => s.fase_seguimiento === "sostenida").length;
  const enRiesgoGrad = graduadas.filter(s => s.fase_seguimiento === "en_riesgo_caida").length;
  const perdidas = graduadas.filter(s => s.fase_seguimiento === "perdida").length;

  // Retos table
  const retoRows = retos.map(r => {
    const rSocias = allSocias.filter(s => s.reto_id === r.id);
    const venta = rSocias.reduce((s, x) => s + Number(x.venta_acumulada || 0), 0);
    const diff = rSocias.reduce((s, x) => s + (Number(x.venta_acumulada || 0) - Number(x.baseline_mensual || 0)), 0);
    const rg1 = rSocias.filter(s => s.graduacion_probable === "G1").length;
    const rg3 = rSocias.filter(s => s.graduacion_probable === "G3").length;
    const pctG1 = rSocias.length > 0 ? (rg1 / rSocias.length) * 100 : 0;
    const pctG3 = rSocias.length > 0 ? (rg3 / rSocias.length) * 100 : 0;
    return { ...r, socias: rSocias.length, venta, diff, pctG1, pctG3 };
  });

  const estadoBadge: Record<string, string> = {
    borrador: "bg-muted-foreground/20 text-muted-foreground",
    publicado: "bg-emerald-500/20 text-emerald-400",
    cerrado: "bg-blue-500/20 text-blue-400",
  };

  const formatMoney = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
    return `$${v.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Ejecutivo</h1>
        {retoActivo && <p className="text-sm text-muted-foreground">{retoActivo.nombre}</p>}
      </div>

      {/* Strategic KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Diferencial */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2"><TrendingUp className="h-5 w-5" /><span className="text-xs">Diferencial Acumulado 2026</span></div>
          <p className={`text-2xl font-bold ${diferencial >= 0 ? "text-emerald-400" : "text-destructive"}`}>{formatMoney(diferencial)}</p>
          <p className="text-[10px] text-muted-foreground">Venta acumulada − baseline de todas las socias</p>
        </div>

        {/* G Distribution */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2"><Target className="h-5 w-5" /><span className="text-xs">Distribución G (Reto Activo)</span></div>
          {totalSocias > 0 ? (
            <div className="space-y-2">
              <GBar label="G1" pct={g1Pct} count={g1} color="bg-emerald-500" />
              <GBar label="G2" pct={g2Pct} count={g2} color="bg-yellow-500" />
              <GBar label="G3" pct={g3Pct} count={g3} color="bg-red-500" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin datos</p>
          )}
        </div>

        {/* Reto Activo */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2"><Target className="h-5 w-5" /><span className="text-xs">Reto Activo</span></div>
          {retoActivo ? (
            <>
              <p className="font-bold">{retoActivo.nombre}</p>
              <p className="text-sm text-muted-foreground">Semana {semanaActual}</p>
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Avance global</span>
                  <span className="font-bold">{pctAvanceGlobal.toFixed(1)}%</span>
                </div>
                <Progress value={Math.min(pctAvanceGlobal, 100)} className="h-2" />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sin reto activo</p>
          )}
        </div>

        {/* Graduadas */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2"><Users className="h-5 w-5" /><span className="text-xs">Graduadas en Seguimiento</span></div>
          <p className="text-2xl font-bold">{graduadas.length}</p>
          <p className="text-[10px] text-muted-foreground">
            {sostenidas} sostenidas · {enRiesgoGrad} en riesgo · {perdidas} perdidas
          </p>
        </div>
      </div>

      {/* Retos History Table */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Resumen por Reto</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Socias</TableHead>
              <TableHead className="text-right">Venta Total</TableHead>
              <TableHead className="text-right">Diferencial</TableHead>
              <TableHead className="text-right">% G1</TableHead>
              <TableHead className="text-right">% G3</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {retoRows.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{format(parseISO(r.fecha_inicio), "dd MMM yy", { locale: es })}</TableCell>
                <TableCell className="text-right">{r.socias}</TableCell>
                <TableCell className="text-right">{formatMoney(r.venta)}</TableCell>
                <TableCell className={`text-right font-medium ${r.diff >= 0 ? "text-emerald-400" : "text-destructive"}`}>{formatMoney(r.diff)}</TableCell>
                <TableCell className="text-right text-emerald-400">{r.pctG1.toFixed(0)}%</TableCell>
                <TableCell className="text-right text-destructive">{r.pctG3.toFixed(0)}%</TableCell>
                <TableCell>
                  <Badge variant="outline" className={estadoBadge[r.estado] || ""}>{r.estado}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Critical Alerts */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Alertas Críticas
        </h3>
        {alertas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sin alertas críticas ✓</p>
        ) : (
          <div className="space-y-2">
            {alertas.map((a: any) => {
              const ago = Math.round((Date.now() - new Date(a.created_at).getTime()) / 3600000);
              return (
                <div key={a.id} className="flex items-center gap-3 text-sm py-2 border-b border-border/50 last:border-0">
                  <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                  <Badge variant="outline" className="text-[10px]">{a.tipo}</Badge>
                  <span className="font-medium truncate">{a.socias_reto?.nombre || "—"}</span>
                  <span className="text-muted-foreground truncate flex-1">{a.titulo}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">hace {ago}h</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function GBar({ label, pct, count, color }: { label: string; pct: number; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-6 font-medium">{label}</span>
      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-12 text-right">{pct.toFixed(0)}% ({count})</span>
    </div>
  );
}
