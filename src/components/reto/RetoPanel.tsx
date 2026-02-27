import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays, parseISO, addDays } from "date-fns";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Upload, TrendingUp, Users, Target, AlertTriangle, Search, Loader2, Undo2, Clock, CalendarDays } from "lucide-react";
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

const DEFAULT_RULES = [
  { nombre: "Socia sin compra día 3+", campo: "dias_sin_compra", operador: ">=", valor: "3", accion_tipo: "contactar", accion_mensaje: "Contactar a {nombre}: lleva {dias_sin_compra} días sin comprar.", prioridad: "alta", asignar_a_rol: "coordinador", semanas_activas: [1, 2, 3, 4], condicion_extra: false },
  { nombre: "Socia primera compra", campo: "primera_compra", operador: "=", valor: "true", accion_tipo: "celebrar", accion_mensaje: "¡Felicitar a {nombre} por su primera compra! Venta: ${venta_acumulada}.", prioridad: "media", asignar_a_rol: "mentora", semanas_activas: [1, 2, 3, 4], condicion_extra: false },
  { nombre: "Socia inactiva 7+ días", campo: "dias_sin_compra", operador: ">=", valor: "7", accion_tipo: "contactar", accion_mensaje: "URGENTE: {nombre} lleva {dias_sin_compra} días sin compra. Intervención requerida.", prioridad: "urgente", asignar_a_rol: "coordinador", semanas_activas: [1, 2, 3, 4], condicion_extra: false },
  { nombre: "CrediPrice no activado día 4+", campo: "crediprice_activo", operador: "=", valor: "false", accion_tipo: "contactar", accion_mensaje: "Revisar CrediPrice con {nombre}. No ha activado su crédito.", prioridad: "media", asignar_a_rol: "coordinador", semanas_activas: [1, 2, 3, 4], condicion_extra: true, campo2: "dias_sin_compra", operador2: ">=", valor2: "4", logica_extra: "AND" },
];

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
  const [activeTab, setActiveTab] = useState("overview");
  const [chartWeek, setChartWeek] = useState("activa");

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
  const totalDias = differenceInDays(fin, inicio) + 1;
  const diaActualRaw = differenceInDays(today, inicio) + 1;

  // Week & status calculation
  const isPreReto = today < inicio;
  const isPostReto = today > fin;
  const diasParaInicio = isPreReto ? differenceInDays(inicio, today) : 0;
  const diasRestantes = isPostReto ? 0 : Math.max(0, differenceInDays(fin, today));
  const diaActual = isPreReto ? 0 : Math.min(diaActualRaw, totalDias);
  const semanaActual = isPreReto ? 0 : isPostReto ? -1 : Math.min(Math.ceil(diaActual / 7), 4);

  const getWeekLabel = () => {
    if (isPreReto) return `Pre-reto · Inicia en ${diasParaInicio} día${diasParaInicio !== 1 ? "s" : ""}`;
    if (isPostReto) return "Reto finalizado";
    return `Semana ${semanaActual} · ${diasRestantes} días restantes`;
  };

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

  // Chart data — filter by week
  const activeChartWeek = chartWeek === "activa" ? (semanaActual > 0 ? semanaActual : 1) : chartWeek === "todo" ? 0 : Number(chartWeek);

  const chartData = metasDiarias
    .filter((m: any) => activeChartWeek === 0 || m.semana === activeChartWeek)
    .map((m: any) => {
      const fecha = m.fecha ? format(parseISO(m.fecha), "d MMM", { locale: es }) : `D${m.dia_numero}`;
      const isPast = m.fecha ? parseISO(m.fecha) <= today : false;
      return {
        dia: fecha,
        meta: Number(m.meta_acumulada_valor),
        real: isPast && Number(m.venta_real) > 0 ? Number(m.venta_real) : undefined,
      };
    });

  // Resumen Diario data — cumulative
  const resumenDiario = (() => {
    let ventaAcum = 0;
    return metasDiarias.map((m: any) => {
      const ventaDia = Number(m.venta_real || 0);
      ventaAcum += ventaDia;
      const metaAcum = Number(m.meta_acumulada_valor || 0);
      const diff = ventaDia > 0 ? ventaAcum - metaAcum : null;
      const pctAv = metaAcum > 0 && ventaDia > 0 ? (ventaAcum / metaAcum) * 100 : null;
      const isPast = m.fecha ? parseISO(m.fecha) <= today : false;
      return {
        fecha: m.fecha ? format(parseISO(m.fecha), "d MMM", { locale: es }) : "",
        diaNumero: m.dia_numero,
        semana: m.semana,
        ventaDia: ventaDia > 0 ? ventaDia : null,
        ventaAcum: ventaDia > 0 ? ventaAcum : null,
        metaDia: Number(m.meta_acumulada_valor || 0) - (m.dia_numero > 1 ? Number(metasDiarias.find((p: any) => p.dia_numero === m.dia_numero - 1)?.meta_acumulada_valor || 0) : 0),
        metaAcum,
        diferencia: diff,
        pctAvance: pctAv,
        isPast,
        hasData: ventaDia > 0,
      };
    });
  })();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["socias-reto"] });
    queryClient.invalidateQueries({ queryKey: ["metas-diarias"] });
    queryClient.invalidateQueries({ queryKey: ["cargas-ventas"] });
  };

  // Ensure default rules exist for this reto
  const ensureDefaultRules = async () => {
    const { data: existingRules } = await supabase
      .from("reglas_metodo")
      .select("id")
      .eq("reto_id", reto.id)
      .eq("activa", true)
      .limit(1);

    if (existingRules && existingRules.length > 0) return;

    console.log("[MOTOR] No hay reglas activas — creando reglas por defecto");
    const inserts = DEFAULT_RULES.map((r, i) => ({
      ...r,
      reto_id: reto.id,
      orden: i + 1,
      activa: true,
    }));
    const { error } = await supabase.from("reglas_metodo").insert(inserts);
    if (error) console.error("[MOTOR] Error creando reglas default:", error);
    else console.log(`[MOTOR] ${inserts.length} reglas por defecto creadas`);
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
            const wb = XLSX.read(e.target?.result, { type: "binary", cellDates: true });
            const ws = wb.Sheets[wb.SheetNames[0]];
            resolve(XLSX.utils.sheet_to_json(ws, { defval: "" }));
          } catch (err) { reject(err); }
        };
        reader.readAsBinaryString(file);
      });

      const firstRow = data[0] || {};
      const parseFecha = (raw: any): string => {
        if (raw == null || raw === "") return format(today, "yyyy-MM-dd");
        if (raw instanceof Date) return format(raw, "yyyy-MM-dd");
        if (typeof raw === "number") {
          const d = new Date((raw - 25569) * 86400 * 1000);
          return format(d, "yyyy-MM-dd");
        }
        const s = String(raw).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
          const parts = s.split("/");
          return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
        return format(today, "yyyy-MM-dd");
      };
      const fechaRaw = firstRow.fecha ?? firstRow.FECHA ?? firstRow.Fecha ?? "";
      const fechaHoy = parseFecha(fechaRaw);
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

      if (reto.estado === "publicado") {
        const { error: transErr } = await supabase.from("retos").update({ estado: "activo" as any }).eq("id", reto.id);
        if (!transErr) { onRefresh(); }
      }

      setUploadProgress({ current: 0, total: data.length });

      for (const row of data) {
        const idSocia = String(row.id_socia ?? row.ID_SOCIA ?? row.Id_Socia ?? "").trim();
        const ventaAcum = Number(row.venta_acumulada ?? row.VENTA_ACUMULADA ?? row.Venta_Acumulada ?? 0);
        if (!idSocia || isNaN(ventaAcum) || ventaAcum < 0) { setUploadProgress(p => ({ ...p, current: p.current + 1 })); continue; }

        const socia = socias.find((s: any) => s.id_socia === idSocia);
        if (!socia) { alertas++; setUploadProgress(p => ({ ...p, current: p.current + 1 })); continue; }

        const { data: prevVenta } = await supabase
          .from("ventas_diarias")
          .select("venta_acumulada")
          .eq("reto_id", reto.id)
          .eq("socia_reto_id", socia.id)
          .order("fecha", { ascending: false })
          .limit(1)
          .maybeSingle();
        const prevAcum = prevVenta ? Number(prevVenta.venta_acumulada) : 0;
        const delta = Math.max(0, ventaAcum - prevAcum);
        ventaTotalDia += delta;

        await supabase.from("ventas_diarias").insert({
          reto_id: reto.id, socia_reto_id: socia.id, id_socia: idSocia, fecha: fechaHoy,
          venta_acumulada: ventaAcum, delta_diario: delta, carga_id: carga.id,
        });

        const pctAvanceSocia = socia.meta_individual > 0 ? (ventaAcum / socia.meta_individual) * 100 : 0;
        const diasSinCompraActual = delta > 0 ? 0 : socia.dias_sin_compra + 1;
        const nuevoEstado = delta > 0 ? "activa" : (diasSinCompraActual >= 7 ? "inactiva" : (diasSinCompraActual >= 3 ? "en_riesgo" : socia.estado));
        const graduacion = pctAvanceSocia >= 100 ? "G1" : (pctAvanceSocia >= 70 ? "G2" : "G3");

        await supabase.from("socias_reto").update({
          venta_acumulada: ventaAcum,
          venta_semanal: delta,
          pct_avance: Math.round(pctAvanceSocia * 100) / 100,
          dias_sin_compra: delta > 0 ? 0 : socia.dias_sin_compra + 1,
          estado: nuevoEstado as any,
          graduacion_probable: graduacion as any,
        }).eq("id", socia.id);

        processed++;
        setUploadProgress(p => ({ ...p, current: p.current + 1 }));
      }

      // Update meta diaria with real sales
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
        await supabase.from("metas_diarias_reto").update({ venta_real: realTotal }).eq("id", metaHoyData.id);
      } else {
        const diaNum = Math.max(1, differenceInDays(parseISO(fechaHoy), inicio) + 1);
        const sem = Math.min(4, Math.ceil(diaNum / 7));
        const pesosArr = Array.isArray(reto.pesos_semanales) ? reto.pesos_semanales : [15, 25, 30, 30];
        const metaGlobal = socias.reduce((s: number, sc: any) => s + Number(sc.meta_individual || 0), 0);
        const diasPorSemana = 7;
        let metaAcum = 0;
        for (let s = 1; s <= sem; s++) {
          const peso = Number(pesosArr[s - 1] || 25) / 100;
          const metaSemana = metaGlobal * peso;
          if (s < sem) { metaAcum += metaSemana; }
          else {
            const diaEnSemana = ((diaNum - 1) % diasPorSemana) + 1;
            metaAcum += metaSemana * (diaEnSemana / diasPorSemana);
          }
        }
        const pctMeta = metaGlobal > 0 ? (metaAcum / metaGlobal) * 100 : 0;
        await supabase.from("metas_diarias_reto").insert({
          reto_id: reto.id, fecha: fechaHoy, dia_numero: diaNum, semana: sem,
          meta_acumulada_valor: Math.round(metaAcum), meta_acumulada_pct: Math.round(pctMeta * 100) / 100, venta_real: realTotal,
        });
      }

      await supabase.from("cargas_ventas").update({
        venta_total_dia: ventaTotalDia, alertas, total_socias: processed,
      }).eq("id", carga.id);

      // === RULES ENGINE ===
      await ensureDefaultRules();

      let accionesGeneradas = 0;
      let reglasEvaluadas = 0;
      try {
        const { data: reglasActivas } = await supabase
          .from("reglas_metodo")
          .select("*")
          .eq("reto_id", reto.id)
          .eq("activa", true);

        if (reglasActivas && reglasActivas.length > 0) {
          const { data: sociasActualizadas } = await supabase
            .from("socias_reto")
            .select("*")
            .eq("reto_id", reto.id);

          const semUpload = getSemana(fechaHoy);

          for (const regla of reglasActivas) {
            if (!regla.semanas_activas?.includes(semUpload)) continue;
            reglasEvaluadas++;

            for (const socia of (sociasActualizadas || [])) {
              if (!evaluateCondition(regla, socia)) continue;

              const { data: existing } = await supabase
                .from("acciones_operativas")
                .select("id")
                .eq("regla_id", regla.id)
                .eq("socia_reto_id", socia.id)
                .in("estado", ["pendiente", "en_progreso"])
                .limit(1);
              if (existing && existing.length > 0) continue;

              let asignadaA = user.id;
              if (regla.asignar_a_rol === "coordinador" && socia.coordinador_id) {
                asignadaA = socia.coordinador_id;
              } else if (regla.asignar_a_rol === "desarrolladora" && socia.desarrolladora_id) {
                asignadaA = socia.desarrolladora_id;
              } else if (regla.asignar_a_rol === "mentora" && socia.mentora_id) {
                asignadaA = socia.mentora_id;
              }

              const mensaje = (regla.accion_mensaje || "")
                .replace(/\{nombre\}/g, socia.nombre)
                .replace(/\{dias_sin_compra\}/g, String(socia.dias_sin_compra))
                .replace(/\{pct_avance\}/g, String(Number(socia.pct_avance).toFixed(1)))
                .replace(/\{venta_semanal\}/g, String(Number(socia.venta_semanal).toLocaleString()))
                .replace(/\{venta_acumulada\}/g, String(Number(socia.venta_acumulada).toLocaleString()));

              const { error: insertErr } = await supabase.from("acciones_operativas").insert({
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
              if (!insertErr) accionesGeneradas++;
            }
          }
        }
      } catch (engineErr) {
        console.error("[MOTOR] Error:", engineErr);
      }

      toast({
        title: "Ventas cargadas",
        description: `${processed} socias · $${ventaTotalDia.toLocaleString()} · ${accionesGeneradas} acciones generadas`,
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
      await supabase.from("ventas_diarias").delete().eq("carga_id", revertCarga.id);
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

      const { data: remainingVentas } = await supabase
        .from("ventas_diarias")
        .select("delta_diario")
        .eq("reto_id", reto.id)
        .eq("fecha", revertCarga.fecha);
      const newVentaReal = (remainingVentas || []).reduce((s: number, v: any) => s + Number(v.delta_diario), 0);
      const metaDia = metasDiarias.find((m: any) => m.fecha === revertCarga.fecha);
      if (metaDia) {
        await supabase.from("metas_diarias_reto").update({ venta_real: newVentaReal }).eq("id", (metaDia as any).id);
      }
      await supabase.from("cargas_ventas").update({ venta_total_dia: 0, total_socias: 0, alertas: 0 }).eq("id", revertCarga.id);
      toast({ title: "Carga revertida" });
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
    graduada: "text-blue-400",
  };

  const gradColor: Record<string, string> = {
    G1: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    G2: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    G3: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const activeCargasOrdered = cargasRecientes.filter((c: any) => c.total_socias > 0);
  const latestCargaId = activeCargasOrdered.length > 0 ? activeCargasOrdered[0].id : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{reto.nombre}</h1>
          <p className="text-sm text-muted-foreground">
            {format(inicio, "d MMM", { locale: es })} — {format(fin, "d MMM yyyy", { locale: es })} · {getWeekLabel()}
          </p>
        </div>
      </div>

      {/* Pre-reto banner */}
      {isPreReto && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-primary mb-2" />
          <p className="text-sm font-medium">El reto inicia el {format(inicio, "d 'de' MMMM yyyy", { locale: es })}</p>
          <p className="text-xs text-muted-foreground mt-1">Faltan {diasParaInicio} días</p>
        </div>
      )}

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

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="resumen">Resumen Diario</TabsTrigger>
          <TabsTrigger value="socias">Socias</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Chart with week tabs */}
          {chartData.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Meta vs Venta Real por Día</h3>
                <Tabs value={chartWeek} onValueChange={setChartWeek}>
                  <TabsList className="h-8">
                    <TabsTrigger value="activa" className="text-xs px-2 h-6">Activa</TabsTrigger>
                    <TabsTrigger value="1" className="text-xs px-2 h-6">S1</TabsTrigger>
                    <TabsTrigger value="2" className="text-xs px-2 h-6">S2</TabsTrigger>
                    <TabsTrigger value="3" className="text-xs px-2 h-6">S3</TabsTrigger>
                    <TabsTrigger value="4" className="text-xs px-2 h-6">S4</TabsTrigger>
                    <TabsTrigger value="todo" className="text-xs px-2 h-6">Todo</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name]}
                  />
                  <Legend />
                  <Bar dataKey="meta" fill="hsl(var(--primary) / 0.3)" name="Meta" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="real" fill="hsl(142 71% 45%)" name="Venta Real" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Upload ventas */}
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
                    <p className="text-xs text-muted-foreground">{uploadProgress.current} de {uploadProgress.total}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="mr-3 h-6 w-6 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Subir Excel de ventas del día</p>
                      <p className="text-xs text-muted-foreground">Columnas: id_socia, nombre, venta_acumulada, fecha</p>
                    </div>
                  </>
                )}
                <input type="file" accept=".xlsx,.xls" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} className="absolute inset-0 cursor-pointer opacity-0" disabled={uploading} />
              </div>

              {cargasRecientes.length > 0 && (
                <div className="rounded-lg border bg-card p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Historial de cargas
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
        </TabsContent>

        <TabsContent value="resumen">
          <div className="rounded-lg border bg-card overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-center">Día</TableHead>
                  <TableHead className="text-right">Venta del Día</TableHead>
                  <TableHead className="text-right">Venta Acum.</TableHead>
                  <TableHead className="text-right">Meta del Día</TableHead>
                  <TableHead className="text-right">Meta Acum.</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
                  <TableHead className="text-right">% Avance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumenDiario.map((r, i) => (
                  <TableRow key={i} className={
                    !r.isPast ? "opacity-50" :
                    r.hasData && r.diferencia !== null && r.diferencia >= 0 ? "bg-emerald-500/5" :
                    r.hasData && r.diferencia !== null && r.diferencia < 0 ? "bg-red-500/5" : ""
                  }>
                    <TableCell className="font-medium">{r.fecha}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{r.diaNumero}</TableCell>
                    <TableCell className="text-right">{r.ventaDia != null ? `$${r.ventaDia.toLocaleString()}` : "—"}</TableCell>
                    <TableCell className="text-right">{r.ventaAcum != null ? `$${r.ventaAcum.toLocaleString()}` : "—"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">${r.metaDia.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-muted-foreground">${r.metaAcum.toLocaleString()}</TableCell>
                    <TableCell className={`text-right font-medium ${r.diferencia != null ? (r.diferencia >= 0 ? "text-emerald-400" : "text-destructive") : ""}`}>
                      {r.diferencia != null ? `${r.diferencia >= 0 ? "+" : ""}$${r.diferencia.toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">{r.pctAvance != null ? `${r.pctAvance.toFixed(1)}%` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* Totals */}
            {resumenDiario.some(r => r.hasData) && (
              <div className="border-t p-4 flex items-center justify-between text-sm font-semibold">
                <span>Total Acumulado</span>
                <div className="flex gap-6">
                  <span>${ventaAcumulada.toLocaleString()}</span>
                  <span className="text-muted-foreground">${metaTotal.toLocaleString()}</span>
                  <span className={pctAvance >= 100 ? "text-emerald-400" : "text-destructive"}>{pctAvance.toFixed(1)}%</span>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="socias" className="space-y-4">
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
                            s.estado === "inactiva" ? "bg-red-400" :
                            s.estado === "graduada" ? "bg-blue-400" : "bg-muted-foreground/40"
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
        </TabsContent>
      </Tabs>

      {/* Revert confirmation */}
      <AlertDialog open={!!revertCarga} onOpenChange={(o) => !o && setRevertCarga(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Deshacer esta carga?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán las ventas del {revertCarga?.fecha} y se recalcularán las métricas.
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
