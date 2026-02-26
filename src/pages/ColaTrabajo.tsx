import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Check, Clock, ArrowUpRight, MessageSquare, StickyNote,
  PartyPopper, CalendarIcon,
} from "lucide-react";

const prioridadColors: Record<string, string> = {
  urgente: "bg-red-500",
  alta: "bg-orange-500",
  media: "bg-blue-500",
  baja: "bg-muted-foreground/40",
};

const origenBadge: Record<string, string> = {
  MÉTODO: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  IA: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  RALLY: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  MANUAL: "bg-muted text-muted-foreground border-border",
  ESCALADA: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

type ModalType = "completar" | "posponer" | "escalar" | "nota" | null;

export default function ColaTrabajo() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("todas");
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedAccion, setSelectedAccion] = useState<any>(null);
  const [comentario, setComentario] = useState("");
  const [resultadoRapido, setResultadoRapido] = useState("");
  const [escalarA, setEscalarA] = useState("");
  const [posponerFecha, setPosponerFecha] = useState<Date | undefined>();
  const [posponerOpcion, setPosponerOpcion] = useState("");

  const isManager = profile?.rol === "director" || profile?.rol === "gerente";

  // Fetch acciones
  const { data: acciones = [], isLoading } = useQuery({
    queryKey: ["cola-trabajo", profile?.id],
    queryFn: async () => {
      let query = supabase
        .from("acciones_operativas")
        .select("*, socias_reto!inner(nombre, telefono, tienda_visita, venta_acumulada, meta_individual, dias_sin_compra, estado, id_socia)")
        .in("estado", ["pendiente", "pospuesta"])
        .order("created_at", { ascending: true });

      // Filter by assignment for operators
      if (!isManager && user) {
        query = query.eq("asignada_a", user.id);
      }

      // Pospuesta: only show if pospuesta_hasta <= now
      const { data, error } = await query;
      if (error) throw error;

      const now = new Date();
      return (data || [])
        .filter((a: any) => {
          if (a.estado === "pospuesta" && a.pospuesta_hasta) {
            return new Date(a.pospuesta_hasta) <= now;
          }
          return true;
        })
        .sort((a: any, b: any) => {
          const pOrder: Record<string, number> = { urgente: 0, alta: 1, media: 2, baja: 3 };
          return (pOrder[a.prioridad] ?? 2) - (pOrder[b.prioridad] ?? 2);
        });
    },
    refetchOnWindowFocus: true,
  });

  // Fetch usuarios for escalar
  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios-activos"],
    queryFn: async () => {
      const { data } = await supabase.from("usuarios").select("id, auth_id, nombre, rol").eq("activo", true);
      return data || [];
    },
  });

  const filtered = acciones.filter((a: any) => {
    if (filter === "urgentes") return a.prioridad === "urgente";
    if (filter === "metodo") return a.origen === "MÉTODO";
    if (filter === "ia") return a.origen === "IA";
    return true;
  });

  const urgentes = acciones.filter((a: any) => a.prioridad === "urgente").length;

  const openModal = (type: ModalType, accion: any) => {
    setSelectedAccion(accion);
    setModal(type);
    setComentario("");
    setResultadoRapido("");
    setEscalarA("");
    setPosponerFecha(undefined);
    setPosponerOpcion("");
  };

  const closeModal = () => { setModal(null); setSelectedAccion(null); };

  // COMPLETAR
  const handleCompletar = async () => {
    if (!selectedAccion || !user || comentario.length < 10) return;
    const resultado = resultadoRapido || "completada";

    await supabase.from("acciones_operativas").update({
      estado: "completada",
      resultado,
      comentario_resultado: comentario,
      fecha_completada: new Date().toISOString(),
    }).eq("id", selectedAccion.id);

    await supabase.from("interacciones").insert({
      reto_id: selectedAccion.reto_id,
      socia_reto_id: selectedAccion.socia_reto_id,
      accion_id: selectedAccion.id,
      usuario_id: user.id,
      tipo: resultado.includes("no_contesto") ? "intento_contacto" : "contacto",
      comentario,
    });

    queryClient.invalidateQueries({ queryKey: ["cola-trabajo"] });
    toast({ title: "Acción completada", description: "Siguiente pendiente." });
    closeModal();
  };

  // POSPONER
  const handlePosponer = async () => {
    if (!selectedAccion) return;
    let hasta: Date;
    const now = new Date();
    if (posponerOpcion === "2h") {
      hasta = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    } else if (posponerOpcion === "manana_am") {
      hasta = new Date(now); hasta.setDate(hasta.getDate() + 1); hasta.setHours(9, 0, 0, 0);
    } else if (posponerOpcion === "manana_pm") {
      hasta = new Date(now); hasta.setDate(hasta.getDate() + 1); hasta.setHours(14, 0, 0, 0);
    } else if (posponerFecha) {
      hasta = posponerFecha;
    } else return;

    const nuevasVeces = (selectedAccion.veces_pospuesta || 0) + 1;
    const nuevoEstado = nuevasVeces >= 2 ? "bloqueada" : "pospuesta";

    await supabase.from("acciones_operativas").update({
      estado: nuevoEstado,
      pospuesta_hasta: hasta.toISOString(),
      veces_pospuesta: nuevasVeces,
    }).eq("id", selectedAccion.id);

    queryClient.invalidateQueries({ queryKey: ["cola-trabajo"] });
    if (nuevasVeces >= 2) {
      toast({ title: "Acción bloqueada", description: "Ha sido pospuesta 2 veces. Se notificará a la Gerente.", variant: "destructive" });
    } else {
      toast({ title: "Acción pospuesta" });
    }
    closeModal();
  };

  // ESCALAR
  const handleEscalar = async () => {
    if (!selectedAccion || !escalarA || comentario.length < 5 || !user) return;

    await supabase.from("acciones_operativas").update({
      estado: "escalada",
      escalada_a: escalarA,
      razon_escalamiento: comentario,
    }).eq("id", selectedAccion.id);

    // Create new action for recipient
    const destUsuario = usuarios.find((u: any) => u.auth_id === escalarA);
    await supabase.from("acciones_operativas").insert({
      reto_id: selectedAccion.reto_id,
      socia_reto_id: selectedAccion.socia_reto_id,
      asignada_a: escalarA,
      tipo: "escalada",
      origen: "ESCALADA",
      titulo: selectedAccion.titulo,
      contexto: `Escalada: ${comentario}\n\nContexto original: ${selectedAccion.contexto || ""}`,
      prioridad: "alta",
    });

    queryClient.invalidateQueries({ queryKey: ["cola-trabajo"] });
    toast({ title: "Acción escalada", description: `Escalada a ${destUsuario?.nombre || "usuario"}` });
    closeModal();
  };

  // NOTA
  const handleNota = async () => {
    if (!selectedAccion || !user || comentario.length < 3) return;
    await supabase.from("interacciones").insert({
      reto_id: selectedAccion.reto_id,
      socia_reto_id: selectedAccion.socia_reto_id,
      accion_id: selectedAccion.id,
      usuario_id: user.id,
      tipo: "nota",
      comentario,
    });
    toast({ title: "Nota guardada" });
    closeModal();
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
          <h1 className="text-2xl font-bold tracking-tight">Cola de Trabajo</h1>
          <p className="text-sm text-muted-foreground">
            {acciones.length} pendientes · {urgentes} urgentes
          </p>
        </div>
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="urgentes">Urgentes</TabsTrigger>
          <TabsTrigger value="metodo">Método</TabsTrigger>
          <TabsTrigger value="ia">IA</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <PartyPopper className="h-16 w-16 text-primary mb-4" />
          <h2 className="text-xl font-bold mb-2">¡Todo al día!</h2>
          <p className="text-muted-foreground">No tienes acciones pendientes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((accion: any) => {
            const socia = accion.socias_reto;
            const isUrgente = accion.prioridad === "urgente";
            return (
              <div
                key={accion.id}
                className={cn(
                  "relative flex items-start gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/5",
                  isUrgente && "bg-red-500/5 border-red-500/20"
                )}
              >
                {/* Priority bar */}
                <div className={cn("w-1 self-stretch rounded-full shrink-0", prioridadColors[accion.prioridad])} />

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={cn("text-[10px] uppercase", origenBadge[accion.origen] || origenBadge.MANUAL)}>
                      {accion.origen}
                    </Badge>
                    <span className="text-sm font-semibold">{accion.titulo}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {socia?.nombre} · {socia?.tienda_visita || "Sin tienda"}
                  </p>
                  {accion.contexto && (
                    <p className="text-xs text-muted-foreground/70 line-clamp-2">{accion.contexto}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/50">
                    {formatDistanceToNow(new Date(accion.created_at), { addSuffix: true, locale: es })}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" onClick={() => openModal("completar", accion)} title="Completar">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10" onClick={() => openModal("posponer", accion)} title="Posponer">
                    <Clock className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10" onClick={() => openModal("escalar", accion)} title="Escalar">
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                  {socia?.telefono && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" asChild title="WhatsApp">
                      <a href={`https://wa.me/${socia.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                        <MessageSquare className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openModal("nota", accion)} title="Nota">
                    <StickyNote className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Completar */}
      <Dialog open={modal === "completar"} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Qué pasó?</DialogTitle>
            <DialogDescription>{selectedAccion?.titulo} — {selectedAccion?.socias_reto?.nombre}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: "contesto_bien", label: "Contestó — todo bien" },
                { val: "contesto_ayuda", label: "Contestó — necesita ayuda" },
                { val: "no_contesto_reintento", label: "No contestó — reintento mañana" },
                { val: "no_contesto_callcenter", label: "No contestó — pasar a call center" },
              ].map((opt) => (
                <Button
                  key={opt.val}
                  variant={resultadoRapido === opt.val ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-auto py-2 whitespace-normal"
                  onClick={() => setResultadoRapido(opt.val)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <Textarea
              placeholder="Notas adicionales (mínimo 10 caracteres)..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button onClick={handleCompletar} disabled={comentario.length < 10}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Posponer */}
      <Dialog open={modal === "posponer"} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cuándo?</DialogTitle>
            <DialogDescription>Posponer: {selectedAccion?.titulo}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: "2h", label: "En 2 horas" },
                { val: "manana_am", label: "Mañana AM" },
                { val: "manana_pm", label: "Mañana PM" },
              ].map((opt) => (
                <Button
                  key={opt.val}
                  variant={posponerOpcion === opt.val ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setPosponerOpcion(opt.val); setPosponerFecha(undefined); }}
                >
                  {opt.label}
                </Button>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={posponerOpcion === "custom" ? "default" : "outline"} size="sm">
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {posponerFecha ? posponerFecha.toLocaleDateString() : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={posponerFecha}
                    onSelect={(d) => { setPosponerFecha(d); setPosponerOpcion("custom"); }}
                    disabled={(d) => d < new Date()}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Textarea placeholder="Razón (opcional)..." value={comentario} onChange={(e) => setComentario(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={handlePosponer} disabled={!posponerOpcion && !posponerFecha}>Posponer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Escalar */}
      <Dialog open={modal === "escalar"} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿A quién escalar?</DialogTitle>
            <DialogDescription>Escalar: {selectedAccion?.titulo}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={escalarA} onValueChange={setEscalarA}>
              <SelectTrigger><SelectValue placeholder="Seleccionar destinatario" /></SelectTrigger>
              <SelectContent>
                {usuarios.filter((u: any) => u.auth_id !== user?.id).map((u: any) => (
                  <SelectItem key={u.auth_id} value={u.auth_id}>
                    {u.nombre} ({u.rol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea placeholder="Razón de escalamiento (obligatorio)..." value={comentario} onChange={(e) => setComentario(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={handleEscalar} disabled={!escalarA || comentario.length < 5}>Escalar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Nota */}
      <Dialog open={modal === "nota"} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar nota</DialogTitle>
            <DialogDescription>{selectedAccion?.socias_reto?.nombre}</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Escribe una nota..." value={comentario} onChange={(e) => setComentario(e.target.value)} className="min-h-[100px]" />
          <DialogFooter>
            <Button onClick={handleNota} disabled={comentario.length < 3}>Guardar nota</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
