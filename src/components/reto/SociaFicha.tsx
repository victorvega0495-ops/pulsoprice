import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import {
  MessageSquare, Phone, StickyNote, ShieldCheck, Brain, CreditCard,
  AlertTriangle, Clock, ArrowUpRight, PartyPopper, X,
} from "lucide-react";

interface SociaFichaProps {
  sociaId: string | null;
  retoId: string;
  open: boolean;
  onClose: () => void;
}

const estadoConfig: Record<string, { color: string; bg: string; label: string }> = {
  inscrita: { color: "text-muted-foreground", bg: "bg-muted", label: "Inscrita" },
  activa: { color: "text-emerald-400", bg: "bg-emerald-500/20", label: "Activa" },
  en_riesgo: { color: "text-yellow-400", bg: "bg-yellow-500/20", label: "En Riesgo" },
  inactiva: { color: "text-red-400", bg: "bg-red-500/20", label: "Inactiva" },
  graduada: { color: "text-blue-400", bg: "bg-blue-500/20", label: "Graduada" },
};

const gradConfig: Record<string, string> = {
  G1: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  G2: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  G3: "bg-red-500/20 text-red-400 border-red-500/30",
};

const tipoIconos: Record<string, string> = {
  llamada: "📞", contacto: "📞", intento_contacto: "📞",
  whatsapp: "💬", nota: "📝", escalamiento: "⬆",
  celebracion: "🎉", completada: "✅",
};

type ModalType = "llamada" | "nota" | "clasificacion" | null;

export function SociaFicha({ sociaId, retoId, open, onClose }: SociaFichaProps) {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalType>(null);
  const [comentario, setComentario] = useState("");
  const [resultadoLlamada, setResultadoLlamada] = useState("");
  const [nuevaG, setNuevaG] = useState("");
  const [editingTel, setEditingTel] = useState(false);
  const [telValue, setTelValue] = useState("");
  const telInputRef = useRef<HTMLInputElement>(null);

  const isManager = profile?.rol === "director" || profile?.rol === "gerente";

  // Fetch socia data
  const { data: socia } = useQuery({
    queryKey: ["socia-ficha", sociaId],
    queryFn: async () => {
      if (!sociaId) return null;
      const { data, error } = await supabase
        .from("socias_reto")
        .select("*")
        .eq("id", sociaId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sociaId && open,
  });

  // Fetch ventas diarias for chart
  const { data: ventasDiarias = [] } = useQuery({
    queryKey: ["socia-ventas", sociaId],
    queryFn: async () => {
      if (!sociaId) return [];
      const { data } = await supabase
        .from("ventas_diarias")
        .select("fecha, delta_diario, venta_acumulada")
        .eq("socia_reto_id", sociaId)
        .eq("reto_id", retoId)
        .order("fecha");
      return data || [];
    },
    enabled: !!sociaId && open,
  });

  // Fetch interacciones
  const { data: interacciones = [] } = useQuery({
    queryKey: ["socia-interacciones", sociaId],
    queryFn: async () => {
      if (!sociaId) return [];
      const { data } = await supabase
        .from("interacciones")
        .select("*")
        .eq("socia_reto_id", sociaId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!sociaId && open,
  });

  // Fetch alertas (acciones pendientes)
  const { data: alertas = [] } = useQuery({
    queryKey: ["socia-alertas", sociaId],
    queryFn: async () => {
      if (!sociaId) return [];
      const { data } = await supabase
        .from("acciones_operativas")
        .select("*")
        .eq("socia_reto_id", sociaId)
        .in("estado", ["pendiente", "pospuesta", "escalada"])
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!sociaId && open,
  });

  // Fetch coordinador & mentora names
  const { data: coordinadorNombre } = useQuery({
    queryKey: ["usuario-nombre", socia?.operador_id],
    queryFn: async () => {
      if (!socia?.operador_id) return null;
      const { data } = await supabase.from("usuarios").select("nombre").eq("auth_id", socia.operador_id).maybeSingle();
      return data?.nombre || null;
    },
    enabled: !!socia?.operador_id,
  });

  const { data: mentoraNombre } = useQuery({
    queryKey: ["mentora-nombre", socia?.mentora_id],
    queryFn: async () => {
      if (!socia?.mentora_id) return null;
      const { data } = await supabase.from("mentoras").select("nombre").eq("id", socia.mentora_id).maybeSingle();
      return data?.nombre || null;
    },
    enabled: !!socia?.mentora_id,
  });

  if (!socia) return null;

  const metaDiariaPromedio = socia.meta_individual > 0 ? socia.meta_individual / 28 : 0;

  const chartData = ventasDiarias.map((v: any, i: number) => ({
    dia: `D${i + 1}`,
    venta: Number(v.delta_diario),
  }));

  const scoreFields = [
    { label: "Prospección", value: Number(socia.score_prospeccion ?? 0) },
    { label: "Presentación", value: Number(socia.score_presentacion ?? 0) },
    { label: "Cierre", value: Number(socia.score_cierre ?? 0) },
    { label: "Gestión", value: Number(socia.score_gestion ?? 0) },
    { label: "Recurrencia", value: Number(socia.score_recurrencia ?? 0) },
  ];

  const est = estadoConfig[socia.estado] || estadoConfig.inscrita;

  const handleRegistrarLlamada = async () => {
    if (!user || comentario.length < 10) return;
    await supabase.from("interacciones").insert({
      reto_id: retoId, socia_reto_id: socia.id, usuario_id: user.id,
      tipo: resultadoLlamada.includes("no_contesto") ? "intento_contacto" : "llamada",
      comentario: `${resultadoLlamada ? `[${resultadoLlamada}] ` : ""}${comentario}`,
    });
    queryClient.invalidateQueries({ queryKey: ["socia-interacciones", sociaId] });
    toast({ title: "Llamada registrada" });
    setModal(null); setComentario(""); setResultadoLlamada("");
  };

  const handleNota = async () => {
    if (!user || comentario.length < 3) return;
    await supabase.from("interacciones").insert({
      reto_id: retoId, socia_reto_id: socia.id, usuario_id: user.id,
      tipo: "nota", comentario,
    });
    queryClient.invalidateQueries({ queryKey: ["socia-interacciones", sociaId] });
    toast({ title: "Nota guardada" });
    setModal(null); setComentario("");
  };

  const handleCambiarG = async () => {
    if (!nuevaG || comentario.length < 5) return;
    await supabase.from("socias_reto").update({
      graduacion_probable: nuevaG as any,
    }).eq("id", socia.id);
    if (user) {
      await supabase.from("interacciones").insert({
        reto_id: retoId, socia_reto_id: socia.id, usuario_id: user.id,
        tipo: "nota", comentario: `Clasificación cambiada a ${nuevaG}: ${comentario}`,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["socia-ficha", sociaId] });
    queryClient.invalidateQueries({ queryKey: ["socia-interacciones", sociaId] });
    toast({ title: `Clasificación actualizada a ${nuevaG}` });
    setModal(null); setComentario(""); setNuevaG("");
  };

  const prioridadColor: Record<string, string> = {
    urgente: "text-red-400", alta: "text-orange-400", media: "text-blue-400", baja: "text-muted-foreground",
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{socia.nombre}</SheetTitle>
            <SheetDescription>Ficha de socia</SheetDescription>
          </SheetHeader>

          {/* Header */}
          <div className="sticky top-0 z-10 bg-background border-b p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{socia.nombre}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                  {editingTel ? (
                    <input
                      ref={telInputRef}
                      autoFocus
                      type="tel"
                      maxLength={10}
                      className="bg-secondary border border-border rounded px-2 py-0.5 text-sm w-32 outline-none focus:ring-1 focus:ring-primary"
                      placeholder="5512345678"
                      value={telValue}
                      onChange={(e) => setTelValue(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      onBlur={async () => {
                        const clean = telValue.replace(/\D/g, "");
                        if (clean && clean.length !== 10) {
                          toast({ title: "El teléfono debe tener 10 dígitos", variant: "destructive" });
                          return;
                        }
                        await supabase.from("socias_reto").update({ telefono: clean || null }).eq("id", socia.id);
                        queryClient.invalidateQueries({ queryKey: ["socia-ficha", sociaId] });
                        toast({ title: "Teléfono actualizado" });
                        setEditingTel(false);
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingTel(false); }}
                    />
                  ) : socia.telefono ? (
                    <span className="flex items-center gap-1.5">
                      <a href={`https://wa.me/52${socia.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${socia.nombre}, soy tu asesora del Reto Price Shoes`)}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                        {socia.telefono}
                      </a>
                      <button onClick={() => { setTelValue(socia.telefono || ""); setEditingTel(true); }} className="text-muted-foreground/50 hover:text-foreground text-xs">✏️</button>
                    </span>
                  ) : (
                    <button onClick={() => { setTelValue(""); setEditingTel(true); }} className="text-muted-foreground/60 hover:text-foreground text-xs italic">
                      Sin teléfono — click para agregar
                    </button>
                  )}
                  {socia.tienda_visita && <span>· {socia.tienda_visita}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {coordinadorNombre && <span>Coord: {coordinadorNombre}</span>}
                  {mentoraNombre && <span>· Mentora: {mentoraNombre}</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge variant="outline" className={`${est.bg} ${est.color} border-0`}>{est.label}</Badge>
                {socia.graduacion_probable && (
                  <Badge variant="outline" className={gradConfig[socia.graduacion_probable] || ""}>{socia.graduacion_probable}</Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs">
              <span className={socia.dias_sin_compra >= 3 ? "text-red-400 font-semibold" : "text-muted-foreground"}>
                {socia.dias_sin_compra} días sin compra
              </span>
              <span className="text-muted-foreground">Baseline: ${Number(socia.baseline_mensual).toLocaleString()}</span>
              <span className="text-muted-foreground">Meta: ${Number(socia.meta_individual).toLocaleString()}</span>
              <span className="font-semibold">{Number(socia.pct_avance).toFixed(1)}% avance</span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {socia.telefono && (
                <Button size="sm" variant="outline" asChild>
                  <a href={`https://wa.me/52${socia.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${socia.nombre}, soy tu asesora del Reto Price Shoes`)}`} target="_blank" rel="noopener noreferrer">
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
                  </a>
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => { setModal("llamada"); setComentario(""); setResultadoLlamada(""); }}>
                <Phone className="mr-1.5 h-3.5 w-3.5" /> Registrar llamada
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setModal("nota"); setComentario(""); }}>
                <StickyNote className="mr-1.5 h-3.5 w-3.5" /> Nota
              </Button>
              {isManager && (
                <Button size="sm" variant="outline" onClick={() => { setModal("clasificacion"); setComentario(""); setNuevaG(""); }}>
                  <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Cambiar G
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-6">
            {/* Section 1: Avance del Reto */}
            <section>
              <h3 className="text-sm font-semibold mb-3">Avance del Reto</h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 18%)" />
                    <XAxis dataKey="dia" tick={{ fontSize: 9, fill: "hsl(218 11% 65%)" }} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(218 11% 65%)" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(220 33% 9%)", border: "1px solid hsl(220 20% 18%)", borderRadius: "8px" }} />
                    <ReferenceLine y={metaDiariaPromedio} stroke="hsl(217 91% 60%)" strokeDasharray="3 3" label={{ value: "Meta", fill: "hsl(217 91% 60%)", fontSize: 10 }} />
                    <Bar dataKey="venta" fill="hsl(142 71% 45%)" radius={[2, 2, 0, 0]} name="Venta diaria" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">Sin ventas registradas</p>
              )}
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Venta acumulada</span>
                  <span>${Number(socia.venta_acumulada).toLocaleString()} / ${Number(socia.meta_individual).toLocaleString()}</span>
                </div>
                <Progress value={Math.min(Number(socia.pct_avance), 100)} className="h-2" />
              </div>
            </section>

            <Separator />

            {/* Section 2: Scorecard */}
            <section>
              <h3 className="text-sm font-semibold mb-3">Scorecard de Habilidades</h3>
              <div className="space-y-2.5">
                {scoreFields.map((sf) => (
                  <div key={sf.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{sf.label}</span>
                      <span className={sf.value > 70 ? "text-emerald-400" : sf.value >= 40 ? "text-yellow-400" : "text-red-400"}>{sf.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${sf.value > 70 ? "bg-emerald-500" : sf.value >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min(sf.value, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            {/* Section 3: CrediPrice */}
            <section>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <CreditCard className="h-4 w-4" /> CrediPrice
              </h3>
              {socia.crediprice_activo ? (
                <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/20 p-3 text-sm">
                  <p className="font-medium text-emerald-400">Activo — ${Number(socia.crediprice_monto).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Capital de trabajo a 28 días sin interés</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No activo</p>
              )}
            </section>

            <Separator />

            {/* Section 4: Timeline */}
            <section>
              <h3 className="text-sm font-semibold mb-3">Timeline de Interacciones</h3>
              {interacciones.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay interacciones registradas</p>
              ) : (
                <div className="space-y-3">
                  {interacciones.map((int: any) => (
                    <div key={int.id} className="flex gap-3 text-sm">
                      <span className="text-lg shrink-0">{tipoIconos[int.tipo] || "📋"}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{int.tipo.replace(/_/g, " ")}</span>
                          <span className="text-[10px] text-muted-foreground/60">
                            {format(new Date(int.created_at), "dd/MM HH:mm", { locale: es })}
                          </span>
                        </div>
                        {int.comentario && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3">{int.comentario}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <Separator />

            {/* Section 5: Alertas */}
            <section>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Alertas Activas
              </h3>
              {alertas.length === 0 ? (
                <p className="text-sm text-emerald-400">Sin alertas activas ✓</p>
              ) : (
                <div className="space-y-2">
                  {alertas.map((a: any) => (
                    <div key={a.id} className="flex items-start gap-2 rounded-lg border p-2.5 text-sm">
                      <span className={`text-xs font-semibold ${prioridadColor[a.prioridad] || ""}`}>{a.prioridad.toUpperCase()}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{a.titulo}</p>
                        {a.contexto && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.contexto}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <Separator />

            {/* Section 6: IA placeholder */}
            <section>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Brain className="h-4 w-4" /> Análisis IA — Próximamente
              </h3>
              <Button variant="outline" size="sm" disabled>Analizar con IA</Button>
            </section>
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal: Registrar llamada */}
      <Dialog open={modal === "llamada"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar llamada</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {["Contestó — todo bien", "Contestó — necesita ayuda", "No contestó — reintento", "No contestó — call center"].map((r) => (
                <Button key={r} size="sm" variant={resultadoLlamada === r ? "default" : "outline"} onClick={() => setResultadoLlamada(r)}>
                  {r}
                </Button>
              ))}
            </div>
            <Textarea placeholder="Notas de la llamada (mínimo 10 caracteres)..." value={comentario} onChange={(e) => setComentario(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={handleRegistrarLlamada} disabled={comentario.length < 10}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Nota */}
      <Dialog open={modal === "nota"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar nota</DialogTitle></DialogHeader>
          <Textarea placeholder="Escribe tu nota..." value={comentario} onChange={(e) => setComentario(e.target.value)} />
          <DialogFooter>
            <Button onClick={handleNota} disabled={comentario.length < 3}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Cambiar G */}
      <Dialog open={modal === "clasificacion"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cambiar clasificación G</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={nuevaG} onValueChange={setNuevaG}>
              <SelectTrigger><SelectValue placeholder="Seleccionar clasificación" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="G1">G1 — Graduación segura</SelectItem>
                <SelectItem value="G2">G2 — Necesita apoyo</SelectItem>
                <SelectItem value="G3">G3 — En riesgo</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Razón del cambio (obligatorio)..." value={comentario} onChange={(e) => setComentario(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={handleCambiarG} disabled={!nuevaG || comentario.length < 5}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
