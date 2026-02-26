import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, TrendingUp, Users, Target, AlertTriangle, Search, Loader2, Undo2, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { SociaFicha } from "@/components/reto/SociaFicha";
interface Props {
  reto: any;
  onRefresh: () => void;
}

function evaluateCondition(regla: any, socia: any): boolean {
  const evalSingle = (campo: string, op: string, valor: string): boolean => {
    let actual: any;
    switch (campo) {
      case "dias_sin_compra": actual = Number(socia.dias_sin_compra); break;
      case "pct_avance": actual = Number(socia.pct_avance); break;
      case "venta_acumulada": actual = Number(socia.venta_acumulada); break;
      case "venta_semanal": actual = Number(socia.venta_semanal); break;
      case "estado": actual = socia.estado; break;
      case "g_probable": actual = socia.graduacion_probable; break;
      case "primera_compra":
        // primera_compra = true means venta_acumulada > 0 and equals today's delta (approximation)
        return valor === "true" ? Number(socia.venta_acumulada) > 0 && Number(socia.venta_acumulada) === Number(socia.venta_semanal) : false;
      case "crediprice_activo":
        return valor === "true" ? socia.crediprice_activo === true : socia.crediprice_activo === false;
      default: return false;
    }
    const numVal = Number(valor);
    const isNum = !isNaN(numVal) && !isNaN(actual);
    switch (op) {
      case ">=": return isNum ? actual >= numVal : false;
      case "<=": return isNum ? actual <= numVal : false;
      case ">": return isNum ? actual > numVal : false;
      case "<": return isNum ? actual < numVal : false;
      case "=": return isNum ? actual === numVal : String(actual) === valor;
      default: return false;
    }
  };

  const result1 = evalSingle(regla.campo, regla.operador, regla.valor);
  if (!regla.condicion_extra || !regla.campo2) return result1;
  const result2 = evalSingle(regla.campo2, regla.operador2, regla.valor2);
  return regla.logica_extra === "OR" ? result1 || result2 : result1 && result2;
}

export function RetoPanel({ reto, onRefresh }: Props) {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [filterEstado, setFilterEstado] = useState("todos");
  const [searchText, setSearchText] = useState("");
  const [selectedSocia, setSelectedSocia] = useState<string | null>(null);
  const [revertCarga, setRevertCarga] = useState<any>(null);

  const isManager = profile?.rol === "director" || profile?.rol === "gerente";

  // Fetch socias
  const { data: socias = [] } = useQuery({
    queryKey: ["socias-reto", reto.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("socias_reto")
        .select("*")
        .eq("reto_id", reto.id)
        .order("nombre");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch metas diarias for chart
  const { data: metasDiarias = [] } = useQuery({
    queryKey: ["metas-diarias", reto.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas_diarias_reto")
        .select("*")
        .eq("reto_id", reto.id)
        .order("dia_numero");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch recent cargas
  const { data: cargasRecientes = [] } = useQuery({
    queryKey: ["cargas-ventas", reto.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cargas_ventas")
        .select("*")
        .eq("reto_id", reto.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  // KPIs
  const totalSocias = socias.length;
  const ventaAcumulada = socias.reduce((sum: number, s: any) => sum + Number(s.venta_acumulada || 0), 0);
  const metaTotal = socias.reduce((sum: number, s: any) => sum + Number(s.meta_individual || 0), 0);
  const pctAvance = metaTotal > 0 ? (ventaAcumulada / metaTotal) * 100 : 0;
  const activas = socias.filter((s: any) => s.estado === "activa").length;
  const enRiesgo = socias.filter((s: any) => s.estado === "en_riesgo").length;
  const inactivas = socias.filter((s: any) => s.estado === "inactiva").length;

  const today = new Date();
  const inicio = parseISO(reto.fecha_inicio);
  const fin = parseISO(reto.fecha_fin);
  const diasRestantes = Math.max(0, differenceInDays(fin, today));
  const totalDias = differenceInDays(fin, inicio) + 1;
  const diaActual = Math.min(differenceInDays(today, inicio) + 1, totalDias);
  const semanaActual = Math.min(Math.ceil(diaActual / 7), 4);

  // Compute semana from arbitrary date
  const getSemana = (fechaStr: string) => {
    const d = parseISO(fechaStr);
    const dia = Math.min(differenceInDays(d, inicio) + 1, totalDias);
    return Math.min(Math.ceil(dia / 7), 4);
  };

  // Filter socias
  const filtered = socias.filter((s: any) => {
    if (filterEstado !== "todos" && s.estado !== filterEstado) return false;
    if (searchText && !s.nombre.toLowerCase().includes(searchText.toLowerCase()) && !s.tienda_visita?.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  // Chart data
  const chartData = metasDiarias.slice(0, 35).map((m: any) => ({
    dia: `D${m.dia_numero}`,
    meta: Number(m.meta_acumulada_valor),
    real: Number(m.venta_real) > 0 ? Number(m.venta_real) : undefined,
  }));

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["socias-reto"] });
    queryClient.invalidateQueries({ queryKey: ["metas-diarias"] });
    queryClient.invalidateQueries({ queryKey: ["cargas-ventas"] });
  };

  // Upload ventas
  const handleUpload = useCallback(async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const data: any = await new Promise((resolve, reject) => {
        reader.onload = (e) => {
          try {
            const wb = XLSX.read(e.target?.result, { type: "binary" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            resolve(XLSX.utils.sheet_to_json(ws, { defval: "" }));
          } catch (err) { reject(err); }
        };
        reader.readAsBinaryString(file);
      });

      // Determine the fecha: read from Excel rows or use today
      // Try to get fecha from Excel data (first row)
      const firstRow = data[0] || {};
      let fechaExcel = String(firstRow.fecha ?? firstRow.FECHA ?? "").trim();
      let fechaHoy: string;
      if (fechaExcel && /^\d{4}-\d{2}-\d{2}$/.test(fechaExcel)) {
        fechaHoy = fechaExcel;
      } else if (fechaExcel && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fechaExcel)) {
        // Handle dd/mm/yyyy format
        const parts = fechaExcel.split("/");
        fechaHoy = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      } else {
        fechaHoy = format(today, "yyyy-MM-dd");
      }
      console.log(`[DEBUG] Fecha de carga determinada: ${fechaHoy}`);
      let ventaTotalDia = 0;
      let alertas = 0;
      let processed = 0;

      const { data: carga, error: cargaErr } = await supabase
        .from("cargas_ventas")
        .insert({
          reto_id: reto.id, fecha: fechaHoy, archivo_nombre: file.name,
          total_socias: data.length, venta_total_dia: 0, alertas: 0, cargado_por: user.id,
        })
        .select().single();
      if (cargaErr) throw cargaErr;

      setUploadProgress({ current: 0, total: data.length });

      for (const row of data) {
        const idSocia = String(row.id_socia ?? row.ID_SOCIA ?? "").trim();
        const ventaAcum = Number(row.venta_acumulada ?? row.VENTA_ACUMULADA ?? 0);
        if (!idSocia) { setUploadProgress(p => ({ ...p, current: p.current + 1 })); continue; }

        const socia = socias.find((s: any) => s.id_socia === idSocia);
        if (!socia) { alertas++; setUploadProgress(p => ({ ...p, current: p.current + 1 })); continue; }

        const delta = Math.max(0, ventaAcum - Number(socia.venta_acumulada || 0));
        ventaTotalDia += delta;

        await supabase.from("ventas_diarias").insert({
          reto_id: reto.id, socia_reto_id: socia.id, fecha: fechaHoy,
          venta_acumulada: ventaAcum, delta_diario: delta, carga_id: carga.id,
        });

        const pctAvanceSocia = socia.meta_individual > 0 ? (ventaAcum / socia.meta_individual) * 100 : 0;
        const nuevoEstado = delta > 0 ? "activa" : (socia.dias_sin_compra >= 3 ? "inactiva" : (socia.dias_sin_compra >= 1 ? "en_riesgo" : socia.estado));
        const graduacion = pctAvanceSocia >= 100 ? "G1" : (pctAvanceSocia >= 70 ? "G2" : "G3");

        await supabase.from("socias_reto").update({
          venta_acumulada: ventaAcum,
          pct_avance: Math.round(pctAvanceSocia * 100) / 100,
          dias_sin_compra: delta > 0 ? 0 : socia.dias_sin_compra + 1,
          estado: nuevoEstado as any,
          graduacion_probable: graduacion as any,
        }).eq("id", socia.id);

        processed++;
        setUploadProgress(p => ({ ...p, current: p.current + 1 }));
      }

      // Update meta diaria with real sales — query actual total for the date (handles multiple uploads same day)
      const { data: allDeltasForDate } = await supabase
        .from("ventas_diarias")
        .select("delta_diario")
        .eq("reto_id", reto.id)
        .eq("fecha", fechaHoy);
      const realTotal = (allDeltasForDate || []).reduce((s: number, v: any) => s + Number(v.delta_diario), 0);

      const { data: metaHoyData } = await supabase
        .from("metas_diarias_reto")
        .select("id")
        .eq("reto_id", reto.id)
        .eq("fecha", fechaHoy)
        .maybeSingle();

      if (metaHoyData) {
        await supabase.from("metas_diarias_reto").update({
          venta_real: realTotal,
        }).eq("id", metaHoyData.id);
        console.log(`Venta real actualizada para ${fechaHoy}: $${realTotal}`);
      } else {
        console.log(`No se encontró meta_diaria para fecha ${fechaHoy} en reto ${reto.id}`);
      }

      await supabase.from("cargas_ventas").update({
        venta_total_dia: ventaTotalDia, alertas, total_socias: processed,
      }).eq("id", carga.id);

      // === RULES ENGINE ===
      let accionesGeneradas = 0;
      try {
        const { data: reglasActivas } = await supabase
          .from("reglas_metodo")
          .select("*")
          .eq("reto_id", reto.id)
          .eq("activa", true);

        if (reglasActivas && reglasActivas.length > 0) {
          // Re-fetch updated socias
          const { data: sociasActualizadas } = await supabase
            .from("socias_reto")
            .select("*")
            .eq("reto_id", reto.id);

          const semUpload = getSemana(fechaHoy);

          for (const regla of reglasActivas) {
            if (!regla.semanas_activas?.includes(semUpload)) continue;

            for (const socia of (sociasActualizadas || [])) {
              if (!evaluateCondition(regla, socia)) continue;

              // Check duplicate
              const { data: existing } = await supabase
                .from("acciones_operativas")
                .select("id")
                .eq("regla_id", regla.id)
                .eq("socia_reto_id", socia.id)
                .in("estado", ["pendiente", "en_progreso"])
                .limit(1);
              if (existing && existing.length > 0) continue;

              // Determine assignee
              let asignadaA = socia.operador_id || user.id;
              if (regla.asignar_a_rol === "mentora" && socia.mentora_id) {
                // For mentora, we still assign to operador_id as the action owner
                asignadaA = socia.operador_id || user.id;
              } else if (regla.asignar_a_rol === "gerente") {
                asignadaA = user.id;
              }

              const mensaje = (regla.accion_mensaje || "")
                .replace(/\{nombre\}/g, socia.nombre)
                .replace(/\{dias_sin_compra\}/g, String(socia.dias_sin_compra))
                .replace(/\{pct_avance\}/g, String(Number(socia.pct_avance).toFixed(1)))
                .replace(/\{venta_semanal\}/g, String(Number(socia.venta_semanal).toLocaleString()));

              await supabase.from("acciones_operativas").insert({
                reto_id: reto.id,
                socia_reto_id: socia.id,
                asignada_a: asignadaA,
                tipo: regla.accion_tipo,
                titulo: regla.nombre,
                contexto: mensaje,
                origen: "metodo",
                prioridad: regla.prioridad,
                estado: "pendiente",
                regla_id: regla.id,
              });
              accionesGeneradas++;
            }
          }
        }
      } catch (engineErr) {
        console.error("Error en motor de reglas:", engineErr);
      }

      const desc = `${processed} socias procesadas · Venta del día: $${ventaTotalDia.toLocaleString()} · ${alertas} alertas` +
        (accionesGeneradas > 0 ? ` · Motor de reglas: ${accionesGeneradas} acciones generadas` : "");

      toast({
        title: "Ventas cargadas",
        description: desc,
      });

      invalidateAll();
    } catch (err: any) {
      toast({ title: "Error al cargar", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [reto, socias, metasDiarias, user, queryClient]);

  // Revert carga
  const handleRevert = async () => {
    if (!revertCarga) return;
    try {
      // 1. Delete ventas_diarias for this carga
      await supabase.from("ventas_diarias").delete().eq("carga_id", revertCarga.id);

      // 2. Recalculate each socia based on remaining ventas
      const { data: allVentas } = await supabase
        .from("ventas_diarias")
        .select("socia_reto_id, venta_acumulada, delta_diario, fecha")
        .eq("reto_id", reto.id)
        .order("fecha", { ascending: false });

      for (const socia of socias) {
        const sociaVentas = (allVentas || []).filter((v: any) => v.socia_reto_id === socia.id);
        const lastVenta = sociaVentas[0];
        const ventaAcum = lastVenta ? Number(lastVenta.venta_acumulada) : 0;
        const pctAv = socia.meta_individual > 0 ? (ventaAcum / socia.meta_individual) * 100 : 0;

        await supabase.from("socias_reto").update({
          venta_acumulada: ventaAcum,
          pct_avance: Math.round(pctAv * 100) / 100,
          estado: ventaAcum > 0 ? "activa" : "inscrita" as any,
          graduacion_probable: (pctAv >= 100 ? "G1" : pctAv >= 70 ? "G2" : "G3") as any,
        }).eq("id", socia.id);
      }

      // 3. Recalculate metas_diarias_reto venta_real for the reverted date
      const { data: remainingVentas } = await supabase
        .from("ventas_diarias")
        .select("delta_diario")
        .eq("reto_id", reto.id)
        .eq("fecha", revertCarga.fecha);

      const newVentaReal = (remainingVentas || []).reduce((s: number, v: any) => s + Number(v.delta_diario), 0);
      const metaDia = metasDiarias.find((m: any) => m.fecha === revertCarga.fecha);
      if (metaDia) {
        await supabase.from("metas_diarias_reto").update({ venta_real: newVentaReal }).eq("id", metaDia.id);
      }

      // 4. Mark carga as reverted (we store 0 values to indicate)
      await supabase.from("cargas_ventas").update({
        venta_total_dia: 0, total_socias: 0, alertas: 0,
      }).eq("id", revertCarga.id);

      toast({ title: "Carga revertida", description: `Se deshicieron las ventas del ${revertCarga.fecha}` });
      invalidateAll();
    } catch (err: any) {
      toast({ title: "Error al revertir", description: err.message, variant: "destructive" });
    } finally {
      setRevertCarga(null);
    }
  };

  const estadoColor: Record<string, string> = {
    inscrita: "text-muted-foreground",
    activa: "text-emerald-400",
    en_riesgo: "text-yellow-400",
    inactiva: "text-destructive",
  };

  const gradColor: Record<string, string> = {
    G1: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    G2: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    G3: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  // Find the latest non-reverted carga for undo
  const activeCargasOrdered = cargasRecientes.filter((c: any) => c.total_socias > 0);
  const latestCargaId = activeCargasOrdered.length > 0 ? activeCargasOrdered[0].id : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{reto.nombre}</h1>
          <p className="text-sm text-muted-foreground">
            {format(inicio, "d MMM", { locale: es })} — {format(fin, "d MMM yyyy", { locale: es })} · Semana {semanaActual} · {diasRestantes} días restantes
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={<Users className="h-5 w-5" />} label="Total Socias" value={String(totalSocias)} />
        <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Venta Acumulada" value={`$${ventaAcumulada.toLocaleString()}`} />
        <KpiCard icon={<Target className="h-5 w-5" />} label="% Avance" value={`${pctAvance.toFixed(1)}%`} />
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-xs">Estado de Socias</span>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="text-emerald-400">{activas} activas</span>
            <span className="text-yellow-400">{enRiesgo} riesgo</span>
            <span className="text-destructive">{inactivas} inactivas</span>
          </div>
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

      {/* Upload ventas + historial */}
      {isManager && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
            className={`relative flex items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border"
            } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3 w-full max-w-sm">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Procesando {uploadProgress.total} socias...</p>
                <Progress value={uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 0} className="w-full" />
                <p className="text-xs text-muted-foreground">{uploadProgress.current} de {uploadProgress.total} registros</p>
              </div>
            ) : (
              <>
                <Upload className="mr-3 h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Subir Excel de ventas del día</p>
                  <p className="text-xs text-muted-foreground">Arrastra el archivo o haz click para seleccionar</p>
                </div>
              </>
            )}
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
              className="absolute inset-0 cursor-pointer opacity-0"
              disabled={uploading}
            />
          </div>

          {/* Upload history */}
          {cargasRecientes.length > 0 && (
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Historial de cargas recientes
              </h4>
              {cargasRecientes.map((c: any) => {
                const isReverted = c.total_socias === 0 && c.venta_total_dia === 0;
                const canUndo = c.id === latestCargaId;
                return (
                  <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{format(new Date(c.created_at), "dd/MM HH:mm")}</span>
                      <span>{c.archivo_nombre}</span>
                      <span className="text-muted-foreground">{c.total_socias} socias</span>
                      <span className="text-muted-foreground">${Number(c.venta_total_dia).toLocaleString()}</span>
                      {isReverted && <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">Revertida</Badge>}
                    </div>
                    {canUndo && !isReverted && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => setRevertCarga(c)}>
                        <Undo2 className="h-3 w-3 mr-1" /> Deshacer
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Revert confirmation */}
      <AlertDialog open={!!revertCarga} onOpenChange={(o) => !o && setRevertCarga(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Deshacer esta carga?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán las ventas del {revertCarga?.fecha} y se recalcularán las métricas de todas las socias. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevert} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deshacer carga
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Socias table */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar socia o tienda..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="inscrita">Inscrita</SelectItem>
              <SelectItem value="activa">Activa</SelectItem>
              <SelectItem value="en_riesgo">En riesgo</SelectItem>
              <SelectItem value="inactiva">Inactiva</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border bg-card overflow-auto max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tienda</TableHead>
                <TableHead className="text-right">Baseline</TableHead>
                <TableHead className="text-right">Venta Acum.</TableHead>
                <TableHead className="text-right">% Avance</TableHead>
                <TableHead className="text-center">Días s/compra</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>G. Probable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No hay socias que coincidan</TableCell>
                </TableRow>
              ) : (
                filtered.map((s: any) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => setSelectedSocia(s.id)}>
                    <TableCell className="font-medium">{s.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{s.tienda_visita || "—"}</TableCell>
                    <TableCell className="text-right">${Number(s.baseline_mensual).toLocaleString()}</TableCell>
                    <TableCell className="text-right">${Number(s.venta_acumulada).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{Number(s.pct_avance).toFixed(1)}%</TableCell>
                    <TableCell className="text-center">{s.dias_sin_compra}</TableCell>
                    <TableCell>
                      <span className={`flex items-center gap-1.5 text-sm ${estadoColor[s.estado] || ""}`}>
                        <span className={`h-2 w-2 rounded-full ${
                          s.estado === "activa" ? "bg-emerald-400" :
                          s.estado === "en_riesgo" ? "bg-yellow-400" :
                          s.estado === "inactiva" ? "bg-red-400" : "bg-muted-foreground/40"
                        }`} />
                        {s.estado}
                      </span>
                    </TableCell>
                    <TableCell>
                      {s.graduacion_probable ? (
                        <Badge variant="outline" className={gradColor[s.graduacion_probable] || ""}>{s.graduacion_probable}</Badge>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} de {totalSocias} socias</p>
      </div>

      {/* Socia ficha drawer */}
      <SociaFicha
        sociaId={selectedSocia}
        retoId={reto.id}
        open={!!selectedSocia}
        onClose={() => setSelectedSocia(null)}
      />
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

