import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { SociaFicha } from "@/components/reto/SociaFicha";
import { Loader2, Wand2, Users, TrendingUp, AlertTriangle, ShieldCheck, XCircle } from "lucide-react";

const FASES = [
  { key: "nueva_graduada", label: "Nueva Graduada", color: "bg-muted-foreground/20", border: "border-muted-foreground/30", textColor: "text-muted-foreground" },
  { key: "activa_seguimiento", label: "Activa Seguimiento", color: "bg-emerald-500/10", border: "border-emerald-500/30", textColor: "text-emerald-400" },
  { key: "en_riesgo_caida", label: "En Riesgo Caída", color: "bg-yellow-500/10", border: "border-yellow-500/30", textColor: "text-yellow-400" },
  { key: "en_recuperacion", label: "En Recuperación", color: "bg-purple-500/10", border: "border-purple-500/30", textColor: "text-purple-400" },
  { key: "sostenida", label: "Sostenida", color: "bg-emerald-600/15", border: "border-emerald-600/40", textColor: "text-emerald-300" },
  { key: "perdida", label: "Perdida", color: "bg-red-500/10", border: "border-red-500/30", textColor: "text-red-400" },
];

const gradConfig: Record<string, string> = {
  G1: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  G2: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  G3: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function PipelineSeguimiento() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [fichaOpen, setFichaOpen] = useState<string | null>(null);
  const [moveModal, setMoveModal] = useState<{ socia: any; targetFase: string } | null>(null);
  const [moveRazon, setMoveRazon] = useState("");
  const [draggedSocia, setDraggedSocia] = useState<any>(null);
  const [simulando, setSimulando] = useState(false);
  const [filterReto, setFilterReto] = useState("todos");

  const isManager = profile?.rol === "director" || profile?.rol === "gerente";

  // Fetch graduadas
  const { data: graduadas = [], isLoading } = useQuery({
    queryKey: ["pipeline-graduadas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("socias_reto")
        .select("*, retos!inner(nombre)")
        .eq("estado", "graduada")
        .order("nombre");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch retos cerrados for filter
  const { data: retosCerrados = [] } = useQuery({
    queryKey: ["retos-cerrados"],
    queryFn: async () => {
      const { data } = await supabase
        .from("retos")
        .select("id, nombre")
        .in("estado", ["cerrado", "publicado"])
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const filtered = graduadas.filter((s: any) => {
    if (filterReto !== "todos" && s.reto_id !== filterReto) return false;
    return true;
  });

  const sociasByFase = (faseKey: string) =>
    filtered.filter((s: any) => s.fase_seguimiento === faseKey);

  // KPIs
  const total = filtered.length;
  const enSeguimiento = filtered.filter((s: any) => s.fase_seguimiento === "activa_seguimiento").length;
  const enRiesgo = filtered.filter((s: any) => s.fase_seguimiento === "en_riesgo_caida").length;
  const recuperadas = filtered.filter((s: any) => s.fase_seguimiento === "en_recuperacion").length;
  const perdidas = filtered.filter((s: any) => s.fase_seguimiento === "perdida").length;

  // Move socia
  const handleMove = async () => {
    if (!moveModal || moveRazon.length < 5 || !user) return;
    const { socia, targetFase } = moveModal;
    const prevFase = socia.fase_seguimiento || "sin_fase";

    await supabase.from("socias_reto").update({
      fase_seguimiento: targetFase,
    }).eq("id", socia.id);

    await supabase.from("interacciones").insert({
      reto_id: socia.reto_id, socia_reto_id: socia.id, usuario_id: user.id,
      tipo: "nota", comentario: `Movida de ${prevFase} a ${targetFase}: ${moveRazon}`,
    });

    queryClient.invalidateQueries({ queryKey: ["pipeline-graduadas"] });
    toast({ title: "Socia movida", description: `Movida a ${FASES.find(f => f.key === targetFase)?.label}` });
    setMoveModal(null);
    setMoveRazon("");
  };

  // Drag handlers
  const handleDragStart = (socia: any) => setDraggedSocia(socia);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (faseKey: string) => {
    if (draggedSocia && draggedSocia.fase_seguimiento !== faseKey) {
      setMoveModal({ socia: draggedSocia, targetFase: faseKey });
    }
    setDraggedSocia(null);
  };

  // Simulate graduations
  const handleSimular = async () => {
    if (!user) return;
    setSimulando(true);
    try {
      const { data: retoActivo } = await supabase
        .from("retos").select("id").eq("estado", "publicado").limit(1).single();
      if (!retoActivo) { toast({ title: "Sin reto activo", variant: "destructive" }); return; }

      const { data: sociasList } = await supabase
        .from("socias_reto").select("id").eq("reto_id", retoActivo.id).eq("estado", "activa").limit(10);
      if (!sociasList?.length) {
        // Try inscrita
        const { data: s2 } = await supabase.from("socias_reto").select("id").eq("reto_id", retoActivo.id).limit(10);
        if (!s2?.length) { toast({ title: "Sin socias disponibles", variant: "destructive" }); return; }
        for (const s of s2) {
          const fasesKeys = FASES.map(f => f.key);
          const randomFase = fasesKeys[Math.floor(Math.random() * fasesKeys.length)];
          const randomG = (["G1", "G2", "G3"] as const)[Math.floor(Math.random() * 3)];
          await supabase.from("socias_reto").update({
            estado: "graduada" as any, fase_seguimiento: randomFase, graduacion_probable: randomG,
          }).eq("id", s.id);
        }
      } else {
        for (const s of sociasList) {
          const fasesKeys = FASES.map(f => f.key);
          const randomFase = fasesKeys[Math.floor(Math.random() * fasesKeys.length)];
          const randomG = (["G1", "G2", "G3"] as const)[Math.floor(Math.random() * 3)];
          await supabase.from("socias_reto").update({
            estado: "graduada" as any, fase_seguimiento: randomFase, graduacion_probable: randomG,
          }).eq("id", s.id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["pipeline-graduadas"] });
      queryClient.invalidateQueries({ queryKey: ["socias-reto"] });
      toast({ title: "Simulación completada", description: "10 socias graduadas con fases aleatorias." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSimulando(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline de Seguimiento</h1>
          <p className="text-sm text-muted-foreground">Gestión post-reto de socias graduadas</p>
        </div>
        {isManager && (
          <Button variant="outline" size="sm" onClick={handleSimular} disabled={simulando}>
            {simulando ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Wand2 className="mr-1.5 h-3.5 w-3.5" />}
            Simular graduación de 10 socias
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="flex flex-wrap gap-4 text-sm">
        <KpiPill icon={<Users className="h-3.5 w-3.5" />} label="Total" value={total} />
        <KpiPill icon={<TrendingUp className="h-3.5 w-3.5" />} label="En seguimiento" value={enSeguimiento} className="text-emerald-400" />
        <KpiPill icon={<AlertTriangle className="h-3.5 w-3.5" />} label="En riesgo" value={enRiesgo} className="text-yellow-400" />
        <KpiPill icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Recuperadas" value={recuperadas} className="text-purple-400" />
        <KpiPill icon={<XCircle className="h-3.5 w-3.5" />} label="Perdidas" value={perdidas} className="text-red-400" />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filterReto} onValueChange={setFilterReto}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Filtrar por reto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los retos</SelectItem>
            {retosCerrados.map((r: any) => (
              <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Empty state */}
      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-bold mb-2">No hay socias graduadas</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Las socias aparecerán aquí cuando se cierre un reto. Usa el botón "Simular graduación" para probar el tablero.
          </p>
        </div>
      ) : (
        /* Kanban Board */
        <div className="flex gap-3 overflow-x-auto pb-4">
          {FASES.map((fase) => {
            const fSocias = sociasByFase(fase.key);
            return (
              <div
                key={fase.key}
                className={`flex-shrink-0 w-64 rounded-lg border ${fase.border} ${fase.color} p-3`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(fase.key)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-xs font-semibold ${fase.textColor}`}>{fase.label}</h3>
                  <Badge variant="outline" className={`text-[10px] ${fase.textColor}`}>{fSocias.length}</Badge>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {fSocias.map((s: any) => (
                    <div
                      key={s.id}
                      draggable
                      onDragStart={() => handleDragStart(s)}
                      onClick={() => setFichaOpen(s.id)}
                      className="rounded-lg border bg-card p-3 cursor-pointer hover:bg-accent/5 transition-colors text-sm"
                    >
                      <p className="font-medium truncate">{s.nombre}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{s.retos?.nombre || "—"}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {s.graduacion_probable && (
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${gradConfig[s.graduacion_probable] || ""}`}>
                            {s.graduacion_probable}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          ${Number(s.venta_acumulada).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                        <span>Base: ${Number(s.baseline_mensual).toLocaleString()}</span>
                        <span>{s.dias_sin_compra}d sin compra</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Move confirmation modal */}
      <Dialog open={!!moveModal} onOpenChange={(o) => !o && setMoveModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              ¿Mover a {FASES.find(f => f.key === moveModal?.targetFase)?.label}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{moveModal?.socia?.nombre}</p>
          <Textarea
            placeholder="Razón del movimiento (obligatorio, mín. 5 caracteres)..."
            value={moveRazon}
            onChange={(e) => setMoveRazon(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveModal(null)}>Cancelar</Button>
            <Button onClick={handleMove} disabled={moveRazon.length < 5}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Socia Ficha */}
      <SociaFicha
        sociaId={fichaOpen}
        retoId={graduadas.find((s: any) => s.id === fichaOpen)?.reto_id || ""}
        open={!!fichaOpen}
        onClose={() => setFichaOpen(null)}
      />
    </div>
  );
}

function KpiPill({ icon, label, value, className = "" }: { icon: React.ReactNode; label: string; value: number; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${className}`}>
      {icon}
      <span className="text-xs">{label}: <strong>{value}</strong></span>
    </div>
  );
}
