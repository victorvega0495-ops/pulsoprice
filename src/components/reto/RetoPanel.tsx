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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Upload, TrendingUp, Users, Target, AlertTriangle, Calendar, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Props {
  reto: any;
  onRefresh: () => void;
}

export function RetoPanel({ reto, onRefresh }: Props) {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterEstado, setFilterEstado] = useState("todos");
  const [searchText, setSearchText] = useState("");
  const [selectedSocia, setSelectedSocia] = useState<any>(null);

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
  const semanaActual = Math.min(Math.ceil((diaActual / totalDias) * 4), 4);

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
    real: Number(m.venta_real),
  }));

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
          } catch (err) {
            reject(err);
          }
        };
        reader.readAsBinaryString(file);
      });

      const fechaHoy = format(today, "yyyy-MM-dd");
      let ventaTotalDia = 0;
      let alertas = 0;
      let processed = 0;

      // Create carga record
      const { data: carga, error: cargaErr } = await supabase
        .from("cargas_ventas")
        .insert({
          reto_id: reto.id,
          fecha: fechaHoy,
          archivo_nombre: file.name,
          total_socias: data.length,
          venta_total_dia: 0,
          alertas: 0,
          cargado_por: user.id,
        })
        .select()
        .single();

      if (cargaErr) throw cargaErr;

      for (const row of data) {
        const idSocia = String(row.id_socia ?? row.ID_SOCIA ?? "").trim();
        const ventaAcum = Number(row.venta_acumulada ?? row.VENTA_ACUMULADA ?? 0);

        if (!idSocia) continue;

        // Find socia in reto
        const socia = socias.find((s: any) => s.id_socia === idSocia);
        if (!socia) { alertas++; continue; }

        const delta = Math.max(0, ventaAcum - Number(socia.venta_acumulada || 0));
        ventaTotalDia += delta;

        // Insert venta diaria
        await supabase.from("ventas_diarias").insert({
          reto_id: reto.id,
          socia_reto_id: socia.id,
          fecha: fechaHoy,
          venta_acumulada: ventaAcum,
          delta_diario: delta,
          carga_id: carga.id,
        });

        // Update socia
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
      }

      // Update meta diaria with real sales
      const metaHoy = metasDiarias.find((m: any) => m.fecha === fechaHoy);
      if (metaHoy) {
        await supabase.from("metas_diarias_reto").update({
          venta_real: ventaTotalDia,
        }).eq("id", metaHoy.id);
      }

      // Update carga with totals
      await supabase.from("cargas_ventas").update({
        venta_total_dia: ventaTotalDia,
        alertas,
        total_socias: processed,
      }).eq("id", carga.id);

      toast({
        title: "Ventas cargadas",
        description: `${processed} socias procesadas · Venta del día: $${ventaTotalDia.toLocaleString()} · ${alertas} alertas`,
      });

      queryClient.invalidateQueries({ queryKey: ["socias-reto"] });
      queryClient.invalidateQueries({ queryKey: ["metas-diarias"] });
    } catch (err: any) {
      toast({ title: "Error al cargar", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [reto, socias, metasDiarias, user, queryClient]);

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
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 18%)" />
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "hsl(218 11% 65%)" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(218 11% 65%)" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(220 33% 9%)", border: "1px solid hsl(220 20% 18%)", borderRadius: "8px" }}
                labelStyle={{ color: "hsl(210 20% 98%)" }}
              />
              <Bar dataKey="meta" fill="hsl(239 84% 67% / 0.3)" name="Meta" radius={[2, 2, 0, 0]} />
              <Bar dataKey="real" fill="hsl(239 84% 67%)" name="Real" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Upload ventas */}
      {isManager && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
          className={`relative flex items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border"
          } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
        >
          <Upload className="mr-3 h-6 w-6 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{uploading ? "Procesando..." : "Subir Excel de ventas del día"}</p>
            <p className="text-xs text-muted-foreground">Arrastra el archivo o haz click para seleccionar</p>
          </div>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
            className="absolute inset-0 cursor-pointer opacity-0"
            disabled={uploading}
          />
        </div>
      )}

      {/* Socias table */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar socia o tienda..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
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
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay socias que coincidan
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s: any) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => setSelectedSocia(s)}>
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
                        <Badge variant="outline" className={gradColor[s.graduacion_probable] || ""}>
                          {s.graduacion_probable}
                        </Badge>
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

      {/* Socia detail modal */}
      <Dialog open={!!selectedSocia} onOpenChange={(o) => !o && setSelectedSocia(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSocia?.nombre}</DialogTitle>
            <DialogDescription>Ficha de socia</DialogDescription>
          </DialogHeader>
          {selectedSocia && (
            <div className="space-y-3 text-sm">
              <Detail label="ID Socia" value={selectedSocia.id_socia} />
              <Detail label="Teléfono" value={selectedSocia.telefono || "—"} />
              <Detail label="Tienda" value={selectedSocia.tienda_visita || "—"} />
              <Detail label="Baseline" value={`$${Number(selectedSocia.baseline_mensual).toLocaleString()}`} />
              <Detail label="Meta Individual" value={`$${Number(selectedSocia.meta_individual).toLocaleString()}`} />
              <Detail label="Venta Acumulada" value={`$${Number(selectedSocia.venta_acumulada).toLocaleString()}`} />
              <Detail label="% Avance" value={`${Number(selectedSocia.pct_avance).toFixed(1)}%`} />
              <Detail label="Días sin compra" value={String(selectedSocia.dias_sin_compra)} />
              <Detail label="Estado" value={selectedSocia.estado} />
              <Detail label="Graduación Probable" value={selectedSocia.graduacion_probable || "—"} />
            </div>
          )}
        </DialogContent>
      </Dialog>
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
