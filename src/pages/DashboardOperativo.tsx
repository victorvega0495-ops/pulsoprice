import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SociaFicha } from "@/components/reto/SociaFicha";
import { useState } from "react";
import {
  TrendingUp, Users, Target, AlertTriangle, ListChecks, Zap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

export default function DashboardOperativo() {
  const { profile } = useAuth();
  const [fichaOpen, setFichaOpen] = useState<string | null>(null);

  // Reto activo
  const { data: reto, isLoading: loadingReto } = useQuery({
    queryKey: ["reto-activo"],
    queryFn: async () => {
      const { data } = await supabase
        .from("retos").select("*").eq("estado", "publicado")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const retoId = reto?.id;

  // Socias
  const { data: socias = [] } = useQuery({
    queryKey: ["socias-reto", retoId],
    enabled: !!retoId,
    queryFn: async () => {
      const { data } = await supabase
        .from("socias_reto").select("*").eq("reto_id", retoId!).order("nombre");
      return data || [];
    },
  });

  // Metas diarias (chart)
  const { data: metasDiarias = [] } = useQuery({
    queryKey: ["metas-diarias", retoId],
    enabled: !!retoId,
    queryFn: async () => {
      const { data } = await supabase
        .from("metas_diarias_reto").select("*").eq("reto_id", retoId!).order("dia_numero");
      return data || [];
    },
  });

  // Acciones
  const { data: acciones = [] } = useQuery({
    queryKey: ["acciones-dashboard", retoId],
    enabled: !!retoId,
    queryFn: async () => {
      const { data } = await supabase
        .from("acciones_operativas").select("*").eq("reto_id", retoId!);
      return data || [];
    },
  });

  // Usuarios (operadores)
  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios-all"],
    queryFn: async () => {
      const { data } = await supabase.from("usuarios").select("*");
      return data || [];
    },
  });

  // Mentoras
  const { data: mentoras = [] } = useQuery({
    queryKey: ["mentoras-all"],
    queryFn: async () => {
      const { data } = await supabase.from("mentoras").select("*");
      return data || [];
    },
  });

  if (loadingReto) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!reto) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h1 className="text-2xl font-bold mb-2">No hay reto activo</h1>
        <p className="text-muted-foreground mb-4">Crea un reto para ver el dashboard operativo.</p>
        <Link to="/reto-activo" className="text-primary underline">Ir a Reto Activo</Link>
      </div>
    );
  }

  // Header data
  const inicio = parseISO(reto.fecha_inicio);
  const fin = parseISO(reto.fecha_fin);
  const today = new Date();
  const diasRestantes = Math.max(0, differenceInDays(fin, today));
  const totalDias = differenceInDays(fin, inicio) + 1;
  const diaActual = Math.min(differenceInDays(today, inicio) + 1, totalDias);
  const semanaActual = Math.min(Math.ceil((diaActual / totalDias) * 4), 4);

  // KPIs
  const ventaAcumulada = socias.reduce((s, x) => s + Number(x.venta_acumulada || 0), 0);
  const metaTotal = socias.reduce((s, x) => s + Number(x.meta_individual || 0), 0);
  const pctAvance = metaTotal > 0 ? (ventaAcumulada / metaTotal) * 100 : 0;
  const activas = socias.filter(s => s.estado === "activa").length;
  const enRiesgo = socias.filter(s => s.estado === "en_riesgo").length;
  const inactivas = socias.filter(s => s.estado === "inactiva").length;
  const g1 = socias.filter(s => s.graduacion_probable === "G1").length;
  const g2 = socias.filter(s => s.graduacion_probable === "G2").length;
  const g3 = socias.filter(s => s.graduacion_probable === "G3").length;

  const accionesPendientes = acciones.filter(a => a.estado === "pendiente" || a.estado === "asignada");
  const urgentes = accionesPendientes.filter(a => a.prioridad === "urgente").length;

  const hoyStr = format(today, "yyyy-MM-dd");
  const accionesHoy = acciones.filter(a => a.created_at?.startsWith(hoyStr));
  const completadasHoy = accionesHoy.filter(a => a.estado === "completada").length;
  const tasaEjecucion = accionesHoy.length > 0 ? (completadasHoy / accionesHoy.length) * 100 : 0;

  // Chart
  const chartData = metasDiarias.slice(0, 35).map((m: any) => ({
    dia: `D${m.dia_numero}`,
    meta: Number(m.meta_acumulada_valor),
    real: Number(m.venta_real) > 0 ? Number(m.venta_real) : undefined,
  }));

  // Operator performance
  const operadores = usuarios.filter(u => u.rol === "operador" || u.rol === "gerente");
  const operadorRows = operadores.map(op => {
    const opSocias = socias.filter(s => s.operador_id === op.id);
    if (opSocias.length === 0) return null;
    const venta = opSocias.reduce((s, x) => s + Number(x.venta_acumulada || 0), 0);
    const meta = opSocias.reduce((s, x) => s + Number(x.meta_individual || 0), 0);
    const pct = meta > 0 ? (venta / meta) * 100 : 0;
    const act = opSocias.filter(s => s.estado === "activa").length;
    const risk = opSocias.filter(s => s.estado === "en_riesgo").length;
    const inact = opSocias.filter(s => s.estado === "inactiva").length;
    const cola = accionesPendientes.filter(a => a.asignada_a === op.id).length;
    return { id: op.id, nombre: op.nombre, socias: opSocias.length, venta, pct, act, risk, inact, cola };
  }).filter(Boolean).sort((a: any, b: any) => b.pct - a.pct);

  // Mentora performance
  const mentoraRows = mentoras.map(m => {
    const mSocias = socias.filter(s => s.mentora_id === m.id);
    if (mSocias.length === 0) return null;
    const venta = mSocias.reduce((s, x) => s + Number(x.venta_acumulada || 0), 0);
    const meta = mSocias.reduce((s, x) => s + Number(x.meta_individual || 0), 0);
    const pct = meta > 0 ? (venta / meta) * 100 : 0;
    return { id: m.id, nombre: m.nombre, socias: mSocias.length, venta, pct };
  }).filter(Boolean).sort((a: any, b: any) => b.pct - a.pct);

  // Recent alerts (acciones escaladas/urgentes)
  const alertas = acciones
    .filter(a => a.estado !== "completada" && (a.prioridad === "urgente" || a.prioridad === "alta" || a.estado === "escalada"))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const pctColor = (v: number) => v > 50 ? "text-emerald-400" : v > 25 ? "text-yellow-400" : "text-destructive";
  const tasaColor = (v: number) => v > 75 ? "text-emerald-400" : v > 50 ? "text-yellow-400" : "text-destructive";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Operativo</h1>
        <p className="text-sm text-muted-foreground">
          {reto.nombre} · Semana {semanaActual} · {diasRestantes} días restantes
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Venta Acumulada"
          value={`$${ventaAcumulada.toLocaleString()}`}
          sub={`de $${metaTotal.toLocaleString()} meta total`} />
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Target className="h-5 w-5" /><span className="text-xs">% Avance Global</span></div>
          <p className={`text-xl font-bold ${pctColor(pctAvance)}`}>{pctAvance.toFixed(1)}%</p>
          <Progress value={Math.min(pctAvance, 100)} className="mt-2 h-2" />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Users className="h-5 w-5" /><span className="text-xs">Socias por Estado</span></div>
          <div className="flex gap-3 text-sm mt-1">
            <span className="text-emerald-400 font-bold">{activas}</span>
            <span className="text-yellow-400 font-bold">{enRiesgo}</span>
            <span className="text-destructive font-bold">{inactivas}</span>
          </div>
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            <span>Activas</span><span>Riesgo</span><span>Inactivas</span>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Target className="h-5 w-5" /><span className="text-xs">G Probable</span></div>
          <div className="flex gap-3 text-sm mt-1">
            <span className="text-emerald-400 font-bold">{g1}</span>
            <span className="text-yellow-400 font-bold">{g2}</span>
            <span className="text-destructive font-bold">{g3}</span>
          </div>
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            <span>G1</span><span>G2</span><span>G3</span>
          </div>
        </div>
        <KpiCard icon={<ListChecks className="h-5 w-5" />} label="Cola de Trabajo"
          value={String(accionesPendientes.length)}
          sub={urgentes > 0 ? `${urgentes} urgentes` : "0 urgentes"}
          subColor={urgentes > 0 ? "text-destructive" : undefined} />
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Zap className="h-5 w-5" /><span className="text-xs">Tasa Ejecución</span></div>
          <p className={`text-xl font-bold ${tasaColor(tasaEjecucion)}`}>{tasaEjecucion.toFixed(0)}%</p>
          <p className="text-[10px] text-muted-foreground">{completadasHoy}/{accionesHoy.length} acciones hoy</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-4 text-sm font-semibold">Meta vs Venta Real por Día</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 18%)" />
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "hsl(218 11% 65%)" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(218 11% 65%)" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(220 33% 9%)", border: "1px solid hsl(220 20% 18%)", borderRadius: "8px" }}
                labelStyle={{ color: "hsl(210 20% 98%)" }}
                formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name]}
              />
              <Legend />
              <Bar dataKey="meta" fill="hsl(217 91% 60% / 0.3)" name="Meta" radius={[2, 2, 0, 0]} />
              <Bar dataKey="real" fill="hsl(142 71% 45%)" name="Venta Real" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Operator Performance */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Performance por Operador</h3>
        {operadorRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No hay operadores asignados al reto</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operador</TableHead>
                <TableHead className="text-right">Socias</TableHead>
                <TableHead className="text-right">Venta</TableHead>
                <TableHead className="text-right">% Avance</TableHead>
                <TableHead className="text-center">Activas</TableHead>
                <TableHead className="text-center">Riesgo</TableHead>
                <TableHead className="text-center">Inactivas</TableHead>
                <TableHead className="text-right">Cola</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operadorRows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nombre}</TableCell>
                  <TableCell className="text-right">{r.socias}</TableCell>
                  <TableCell className="text-right">${r.venta.toLocaleString()}</TableCell>
                  <TableCell className={`text-right font-medium ${pctColor(r.pct)}`}>{r.pct.toFixed(1)}%</TableCell>
                  <TableCell className="text-center text-emerald-400">{r.act}</TableCell>
                  <TableCell className="text-center text-yellow-400">{r.risk}</TableCell>
                  <TableCell className="text-center text-destructive">{r.inact}</TableCell>
                  <TableCell className="text-right">{r.cola}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Mentora Performance */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Performance por Mentora</h3>
        {mentoraRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No hay mentoras asignadas al reto</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mentora</TableHead>
                <TableHead className="text-right">Socias</TableHead>
                <TableHead className="text-right">Venta</TableHead>
                <TableHead className="text-right">% Avance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mentoraRows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nombre}</TableCell>
                  <TableCell className="text-right">{r.socias}</TableCell>
                  <TableCell className="text-right">${r.venta.toLocaleString()}</TableCell>
                  <TableCell className={`text-right font-medium ${pctColor(r.pct)}`}>{r.pct.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Alertas Recientes */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Alertas Recientes
        </h3>
        {alertas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sin alertas activas ✓</p>
        ) : (
          <div className="space-y-2">
            {alertas.map((a: any) => {
              const socia = socias.find(s => s.id === a.socia_reto_id);
              const ago = Math.round((Date.now() - new Date(a.created_at).getTime()) / 3600000);
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 text-sm py-2 border-b border-border/50 last:border-0 cursor-pointer hover:bg-accent/5"
                  onClick={() => socia && setFichaOpen(socia.id)}
                >
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${a.prioridad === "urgente" ? "bg-red-500" : "bg-yellow-500"}`} />
                  <Badge variant="outline" className="text-[10px]">{a.tipo}</Badge>
                  <span className="font-medium truncate">{socia?.nombre || "—"}</span>
                  <span className="text-muted-foreground truncate flex-1">{a.titulo}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">hace {ago}h</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SociaFicha
        sociaId={fichaOpen}
        retoId={retoId || ""}
        open={!!fichaOpen}
        onClose={() => setFichaOpen(null)}
      />
    </div>
  );
}

function KpiCard({ icon, label, value, sub, subColor }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; subColor?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">{icon}<span className="text-xs">{label}</span></div>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className={`text-[10px] ${subColor || "text-muted-foreground"}`}>{sub}</p>}
    </div>
  );
}
