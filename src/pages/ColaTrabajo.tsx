import { useState, useCallback } from "react";
import { SociaFicha } from "@/components/reto/SociaFicha";
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
  PartyPopper, CalendarIcon, Wand2, Loader2,
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
  metodo: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ia: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  metodo_ia: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  sistema: "bg-muted text-muted-foreground border-border",
  manual: "bg-muted text-muted-foreground border-border",
};

type ModalType = "completar" | "posponer" | "escalar" | "nota" | null;

const TEST_ACTIONS = [
  { tipo: "contactar", titulo: "Contactar socia inactiva 3 días", prioridad: "alta", origen: "MÉTODO", contexto: "Sin compra desde hace 3 días. Verificar si tiene producto disponible." },
  { tipo: "contactar", titulo: "Contactar socia inactiva 5 días", prioridad: "urgente", origen: "MÉTODO", contexto: "5 días sin actividad. Intervención urgente antes de perderla." },
  { tipo: "celebrar", titulo: "Felicitar por primera venta", prioridad: "media", origen: "MÉTODO", contexto: "Primera venta registrada ayer. Reforzar positivamente." },
  { tipo: "celebrar", titulo: "Celebrar meta semanal alcanzada", prioridad: "baja", origen: "IA", contexto: "Superó su meta de la semana 1. Reconocer el logro." },
  { tipo: "diagnosticar", titulo: "Revisar patrón de caída", prioridad: "alta", origen: "IA", contexto: "Vendía $1,200/día y bajó a $300. Posible problema con inventario." },
  { tipo: "contactar", titulo: "Seguimiento post-llamada", prioridad: "media", origen: "MANUAL", contexto: "Se habló ayer, quedó de publicar en Marketplace. Verificar si lo hizo." },
  { tipo: "contactar", titulo: "Activar CrediPrice", prioridad: "media", origen: "MÉTODO", contexto: "Socia con potencial pero sin capital. Sugerir CrediPrice para su primera compra grande." },
  { tipo: "escalar", titulo: "Problema con pedido en tienda", prioridad: "urgente", origen: "MANUAL", contexto: "Socia reporta que su pedido no llegó a tienda. Escalar a call center." },
  { tipo: "contactar", titulo: "Reactivar socia con potencial", prioridad: "alta", origen: "IA", contexto: "Perfil similar a G1 exitosas pero no ha comprado esta semana. Vale la pena intervenir." },
  { tipo: "contactar", titulo: "Recordar taller presencial", prioridad: "baja", origen: "MÉTODO", contexto: "Taller de la semana 2 es mañana. Confirmar asistencia." },
];

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
  const [filterOperador, setFilterOperador] = useState("todos");
  const [filterRetoId, setFilterRetoId] = useState<string>("auto");
  const [generando, setGenerando] = useState(false);
  const [reasignando, setReasignando] = useState(false);
  const [fichaOpen, setFichaOpen] = useState<string | null>(null);

  const isManager = profile?.rol === "director" || profile?.rol === "gerente";
  const isMentora = profile?.rol === "mentora";

  // Fetch retos for filter (include closed/cancelled for display but flag them)
  const { data: retosDisponibles = [] } = useQuery({
    queryKey: ["retos-cola"],
    queryFn: async () => {
      const { data } = await supabase
        .from("retos")
        .select("id, nombre, estado, tipo_reto")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const retosActivos = retosDisponibles.filter((r: any) => ["publicado", "activo", "en_cierre"].includes(r.estado));
  const retosCerrados = retosDisponibles.filter((r: any) => ["cerrado", "cancelado"].includes(r.estado));
  const selectedRetoCerrado = filterRetoId !== "auto" && filterRetoId !== "todos" && filterRetoId !== "operacion" && filterRetoId !== "seguimiento"
    && retosCerrados.some((r: any) => r.id === filterRetoId);

  // Determine the active reto id for default filter — show all by default
  const activeRetoId = filterRetoId === "auto"
    ? null // Show all active retos by default
    : filterRetoId === "todos" ? null
    : filterRetoId === "operacion" ? "operacion"
    : filterRetoId === "seguimiento" ? "seguimiento"
    : filterRetoId;

  // Fetch acciones
  const { data: acciones = [], isLoading } = useQuery({
    queryKey: ["cola-trabajo", profile?.id, activeRetoId, selectedRetoCerrado],
    queryFn: async () => {
      let query = supabase
        .from("acciones_operativas")
        .select("*, socias_reto!inner(nombre, telefono, tienda_visita, venta_acumulada, meta_individual, dias_sin_compra, estado, id_socia, baseline_mensual, pct_avance), retos!inner(nombre, tipo_reto, estado)")
        .in("estado", ["pendiente", "pospuesta"])
        .order("created_at", { ascending: true });

      // Only show actions from active retos unless user explicitly picks a closed one
      if (!selectedRetoCerrado) {
        query = query.in("retos.estado", ["publicado", "activo", "en_cierre"]);
      }

      if (activeRetoId && activeRetoId !== "operacion" && activeRetoId !== "seguimiento") {
        query = query.eq("reto_id", activeRetoId);
      }

      if (!isManager && user) {
        query = query.eq("asignada_a", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const now = new Date();
      return (data || [])
        .filter((a: any) => {
          if (a.estado === "pospuesta" && a.pospuesta_hasta) {
            if (new Date(a.pospuesta_hasta) > now) return false;
          }
          // Filter by tipo_reto if selected
          if (activeRetoId === "operacion" && a.retos?.tipo_reto !== "operacion") return false;
          if (activeRetoId === "seguimiento" && a.retos?.tipo_reto !== "seguimiento") return false;
          return true;
        })
        .sort((a: any, b: any) => {
          const pOrder: Record<string, number> = { urgente: 0, alta: 1, media: 2, baja: 3 };
          return (pOrder[a.prioridad] ?? 2) - (pOrder[b.prioridad] ?? 2);
        });
    },
    refetchOnWindowFocus: true,
  });

  // Fetch usuarios for escalar & filter
  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios-activos"],
    queryFn: async () => {
      const { data } = await supabase.from("usuarios").select("id, auth_id, nombre, rol").eq("activo", true);
      return data || [];
    },
  });

  const equipo = usuarios.filter((u: any) => ["coordinador", "desarrolladora", "gerente", "mentora"].includes(u.rol));

  // Build lookup for both id and auth_id so filter works with old and new data
  const authToId: Record<string, string> = {};
  const idToAuth: Record<string, string> = {};
  for (const u of usuarios) {
    authToId[(u as any).auth_id] = (u as any).id;
    idToAuth[(u as any).id] = (u as any).auth_id;
  }

  const filtered = acciones.filter((a: any) => {
    if (filter === "urgentes") return a.prioridad === "urgente";
    if (filter === "metodo") return a.origen === "MÉTODO" || a.origen === "metodo";
    if (filter === "ia") return a.origen === "IA" || a.origen === "ia" || a.origen === "metodo_ia";
    if (filterOperador !== "todos") {
      // Match by auth_id or usuarios.id (backward compat)
      const selectedAuthId = filterOperador;
      const selectedUsuarioId = authToId[filterOperador];
      return a.asignada_a === selectedAuthId || a.asignada_a === selectedUsuarioId;
    }
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

  const handleCompletar = async () => {
    if (!selectedAccion || !user || comentario.length < 10) return;
    const resultado = resultadoRapido || "completada";
    await supabase.from("acciones_operativas").update({
      estado: "completada", resultado, comentario_resultado: comentario, fecha_completada: new Date().toISOString(),
    }).eq("id", selectedAccion.id);
    await supabase.from("interacciones").insert({
      reto_id: selectedAccion.reto_id, socia_reto_id: selectedAccion.socia_reto_id,
      accion_id: selectedAccion.id, usuario_id: user.id,
      tipo: resultado.includes("no_contesto") ? "intento_contacto" : "contacto", comentario,
    });
    queryClient.invalidateQueries({ queryKey: ["cola-trabajo"] });
    toast({ title: "Acción completada", description: "Siguiente pendiente." });
    closeModal();
  };

  const handlePosponer = async () => {
    if (!selectedAccion) return;
    let hasta: Date;
    const now = new Date();
    if (posponerOpcion === "2h") { hasta = new Date(now.getTime() + 2 * 60 * 60 * 1000); }
    else if (posponerOpcion === "manana_am") { hasta = new Date(now); hasta.setDate(hasta.getDate() + 1); hasta.setHours(9, 0, 0, 0); }
    else if (posponerOpcion === "manana_pm") { hasta = new Date(now); hasta.setDate(hasta.getDate() + 1); hasta.setHours(14, 0, 0, 0); }
    else if (posponerFecha) { hasta = posponerFecha; }
    else return;

    const nuevasVeces = (selectedAccion.veces_pospuesta || 0) + 1;
    const nuevoEstado = nuevasVeces >= 2 ? "bloqueada" : "pospuesta";
    await supabase.from("acciones_operativas").update({
      estado: nuevoEstado, pospuesta_hasta: hasta.toISOString(), veces_pospuesta: nuevasVeces,
    }).eq("id", selectedAccion.id);
    queryClient.invalidateQueries({ queryKey: ["cola-trabajo"] });
    if (nuevasVeces >= 2) {
      toast({ title: "Acción bloqueada", description: "Ha sido pospuesta 2 veces. Se notificará a la Gerente.", variant: "destructive" });
    } else { toast({ title: "Acción pospuesta" }); }
    closeModal();
  };

  const handleEscalar = async () => {
    if (!selectedAccion || !escalarA || comentario.length < 5 || !user) return;
    await supabase.from("acciones_operativas").update({
      estado: "escalada", escalada_a: escalarA, razon_escalamiento: comentario,
    }).eq("id", selectedAccion.id);
    const destUsuario = usuarios.find((u: any) => u.auth_id === escalarA);
    await supabase.from("acciones_operativas").insert({
      reto_id: selectedAccion.reto_id, socia_reto_id: selectedAccion.socia_reto_id,
      asignada_a: escalarA, tipo: "escalada", origen: "ESCALADA", titulo: selectedAccion.titulo,
      contexto: `Escalada: ${comentario}\n\nContexto original: ${selectedAccion.contexto || ""}`, prioridad: "alta",
    });
    queryClient.invalidateQueries({ queryKey: ["cola-trabajo"] });
    toast({ title: "Acción escalada", description: `Escalada a ${destUsuario?.nombre || "usuario"}` });
    closeModal();
  };

  const handleNota = async () => {
    if (!selectedAccion || !user || comentario.length < 3) return;
    await supabase.from("interacciones").insert({
      reto_id: selectedAccion.reto_id, socia_reto_id: selectedAccion.socia_reto_id,
      accion_id: selectedAccion.id, usuario_id: user.id, tipo: "nota", comentario,
    });
    toast({ title: "Nota guardada" });
    closeModal();
  };

  // Generate test data
  const handleGenerarPruebas = async () => {
    if (!user) return;
    setGenerando(true);
    try {
      // Get active reto
      const { data: retoActivo } = await supabase
        .from("retos")
        .select("id")
        .in("estado", ["activo", "publicado"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!retoActivo) {
        toast({ title: "Sin reto activo", description: "Primero publica un reto para generar acciones de prueba.", variant: "destructive" });
        setGenerando(false);
        return;
      }

      // Get socias from reto
      const { data: sociasList } = await supabase
        .from("socias_reto")
        .select("id")
        .eq("reto_id", retoActivo.id)
        .limit(20);

      if (!sociasList || sociasList.length === 0) {
        toast({ title: "Sin socias", description: "El reto activo no tiene socias.", variant: "destructive" });
        setGenerando(false);
        return;
      }

      const inserts = TEST_ACTIONS.map((a, i) => ({
        reto_id: retoActivo.id,
        socia_reto_id: sociasList[i % sociasList.length].id,
        asignada_a: user.id,
        tipo: a.tipo,
        titulo: a.titulo,
        prioridad: a.prioridad,
        origen: a.origen,
        contexto: a.contexto,
        estado: "pendiente",
      }));

      const { error } = await supabase.from("acciones_operativas").insert(inserts);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["cola-trabajo"] });
      toast({ title: "Datos de prueba creados", description: "10 acciones generadas correctamente." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerando(false);
    }
  };

  // Reassign all pending actions to correct owners
  const handleReasignar = async () => {
    setReasignando(true);
    try {
      const { data: pendientes } = await supabase
        .from("acciones_operativas")
        .select("id, regla_id, socia_reto_id, asignada_a")
        .in("estado", ["pendiente", "pospuesta"]);
      if (!pendientes || pendientes.length === 0) {
        toast({ title: "Sin acciones pendientes" });
        setReasignando(false);
        return;
      }
      const reglaIds = [...new Set(pendientes.map(a => a.regla_id).filter(Boolean))];
      const { data: reglas } = await supabase
        .from("reglas_metodo").select("id, asignar_a_rol")
        .in("id", reglaIds.length > 0 ? reglaIds : ["00000000-0000-0000-0000-000000000000"]);
      const reglaMap: Record<string, string> = {};
      for (const r of (reglas || [])) reglaMap[r.id] = r.asignar_a_rol;
      const sociaIds = [...new Set(pendientes.map(a => a.socia_reto_id))];
      const { data: sociasList } = await supabase
        .from("socias_reto").select("id, coordinador_id, desarrolladora_id, mentora_id")
        .in("id", sociaIds);
      const sociaMap: Record<string, any> = {};
      for (const s of (sociasList || [])) sociaMap[s.id] = s;
      const { data: allUsers } = await supabase
        .from("usuarios").select("id, auth_id, rol").eq("activo", true);
      const uIdToAuth: Record<string, string> = {};
      let gerenteAuth = "";
      for (const u of (allUsers || [])) {
        uIdToAuth[u.id] = u.auth_id;
        if (u.rol === "gerente") gerenteAuth = u.auth_id;
      }
      // Mentora lookup
      const { data: mentorasLookup } = await supabase
        .from("mentoras").select("id, usuario_id").eq("activa", true);
      const mentoraIdToUsuarioId: Record<string, string> = {};
      for (const m of (mentorasLookup || [])) {
        if (m.usuario_id) mentoraIdToUsuarioId[m.id] = m.usuario_id;
      }
      let updated = 0;
      for (const accion of pendientes) {
        const rol = accion.regla_id ? reglaMap[accion.regla_id] : null;
        const socia = sociaMap[accion.socia_reto_id];
        if (!socia) continue;
        let newAsignada = gerenteAuth;
        if (rol === "coordinador" && socia.coordinador_id && uIdToAuth[socia.coordinador_id]) {
          newAsignada = uIdToAuth[socia.coordinador_id];
        } else if (rol === "desarrolladora" && socia.desarrolladora_id && uIdToAuth[socia.desarrolladora_id]) {
          newAsignada = uIdToAuth[socia.desarrolladora_id];
        } else if (rol === "mentora" && socia.mentora_id) {
          const usuarioId = mentoraIdToUsuarioId[socia.mentora_id];
          if (usuarioId && uIdToAuth[usuarioId]) {
            newAsignada = uIdToAuth[usuarioId];
          } else if (socia.coordinador_id && uIdToAuth[socia.coordinador_id]) {
            newAsignada = uIdToAuth[socia.coordinador_id];
          }
        }
        if (newAsignada !== accion.asignada_a) {
          await supabase.from("acciones_operativas").update({ asignada_a: newAsignada }).eq("id", accion.id);
          updated++;
        }
      }
      queryClient.invalidateQueries({ queryKey: ["cola-trabajo"] });
      toast({ title: "Reasignación completada", description: `${updated} acciones reasignadas de ${pendientes.length} totales.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setReasignando(false);
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
          <h1 className="text-2xl font-bold tracking-tight">Cola de Trabajo</h1>
          <p className="text-sm text-muted-foreground">
            {acciones.length} pendientes · {urgentes} urgentes
          </p>
        </div>
        {isManager && !isMentora && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReasignar} disabled={reasignando}>
              {reasignando ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />}
              Reasignar acciones pendientes
            </Button>
            <Button variant="outline" size="sm" onClick={handleGenerarPruebas} disabled={generando}>
              {generando ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Wand2 className="mr-1.5 h-3.5 w-3.5" />}
              Generar pruebas
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterRetoId} onValueChange={setFilterRetoId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Reto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Todos mis retos</SelectItem>
            <SelectItem value="operacion">Solo Operación</SelectItem>
            <SelectItem value="seguimiento">Solo Seguimiento</SelectItem>
            {retosActivos.map((r: any) => (
              <SelectItem key={r.id} value={r.id}>{r.nombre} ({r.tipo_reto === "seguimiento" ? "Seg." : "Op."})</SelectItem>
            ))}
            {retosCerrados.length > 0 && (
              <>
                <SelectItem value="__sep" disabled>── Cerrados / Cancelados ──</SelectItem>
                {retosCerrados.map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.nombre} ({r.estado})</SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
        <Tabs value={filter} onValueChange={(v) => { setFilter(v); setFilterOperador("todos"); }}>
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="urgentes">Urgentes</TabsTrigger>
            <TabsTrigger value="metodo">Método</TabsTrigger>
            <TabsTrigger value="ia">IA</TabsTrigger>
          </TabsList>
        </Tabs>
        {isManager && !isMentora && (
          <Select value={filterOperador} onValueChange={(v) => { setFilterOperador(v); setFilter("todas"); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por equipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todo el equipo</SelectItem>
              {equipo.map((u: any) => (
                <SelectItem key={u.auth_id} value={u.auth_id}>{u.nombre} ({u.rol})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Empty state */}
      {selectedRetoCerrado ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Reto cerrado</h2>
          <p className="text-muted-foreground">Este reto está cerrado. No hay acciones pendientes.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Las acciones fueron canceladas automáticamente al cerrar el reto.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <PartyPopper className="h-16 w-16 text-primary mb-4" />
          <h2 className="text-xl font-bold mb-2">¡Todo al día!</h2>
          <p className="text-muted-foreground mb-2">No tienes acciones pendientes.</p>
          <p className="text-xs text-muted-foreground/70 max-w-sm text-center">
            Las acciones se generan automáticamente al cargar ventas si el reto tiene reglas activas. Ve a Reglas del Método para configurarlas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((accion: any) => {
            const socia = accion.socias_reto;
            const isUrgente = accion.prioridad === "urgente";
            const isAlta = accion.prioridad === "alta";
            const origenKey = accion.origen?.toUpperCase?.() || accion.origen;
            const asignadoNombre = usuarios.find((u: any) => u.auth_id === accion.asignada_a || u.id === accion.asignada_a)?.nombre || "Sin asignar";
            const diasSinCompra = Number(socia?.dias_sin_compra || 0);
            const accionIcon = accion.tipo === "celebrar" ? "🎉" : accion.tipo === "diagnosticar" ? "🔍" : "📞";
            const borderColor = isUrgente ? "border-l-red-500" : isAlta ? "border-l-orange-500" : "border-l-muted-foreground/30";

            return (
              <div
                key={accion.id}
                className={cn(
                  "relative rounded-lg border border-l-4 bg-card p-4 transition-colors hover:bg-accent/5",
                  borderColor,
                  isUrgente && "bg-red-500/5"
                )}
              >
                <div className="flex gap-4">
                  {/* Main content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* LINE 1: Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cn("text-[10px] uppercase", accion.retos?.tipo_reto === "seguimiento" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30")}>
                        {accion.retos?.nombre || "Reto"}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[10px] uppercase", origenBadge[accion.origen] || origenBadge[origenKey] || origenBadge.MANUAL)}>
                        {accion.origen}
                      </Badge>
                      {isUrgente && <Badge variant="destructive" className="text-[10px]">URGENTE</Badge>}
                    </div>

                    {/* LINE 2: Socia name — prominent */}
                    <button
                      className="text-left text-lg font-bold text-foreground hover:underline"
                      onClick={() => setFichaOpen(accion.socia_reto_id)}
                    >
                      {socia?.nombre || "Socia"}
                    </button>

                    {/* LINE 3: Context info */}
                    <p className="text-sm text-muted-foreground">
                      {socia?.tienda_visita || "Sin tienda"}
                      {socia?.baseline_mensual != null && <> · Baseline ${Number(socia.baseline_mensual).toLocaleString()}</>}
                      {socia?.pct_avance != null && <> · Avance {Number(socia.pct_avance).toFixed(0)}%</>}
                      {diasSinCompra > 0 && (
                        <> · <span className={cn(diasSinCompra >= 3 && "text-red-400 font-medium")}>Días s/compra: {diasSinCompra}</span></>
                      )}
                    </p>

                    {/* LINE 4: The action — highlighted */}
                    <div className="rounded-md bg-accent/30 border border-border/50 px-3 py-2">
                      <p className="text-sm font-medium">
                        <span className="mr-1.5">{accionIcon}</span>
                        {accion.contexto || accion.titulo}
                      </p>
                      {accion.tactica && (
                        <p className="text-xs text-muted-foreground mt-1">💡 Táctica: {accion.tactica}</p>
                      )}
                      {accion.contexto_ia && (
                        <p className="text-xs text-muted-foreground/70 mt-1 italic">{accion.contexto_ia}</p>
                      )}
                    </div>

                    {/* LINE 5: Assignment + time */}
                    <p className="text-[11px] text-muted-foreground/60">
                      → {asignadoNombre} · {formatDistanceToNow(new Date(accion.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>

                  {/* Action buttons — vertical */}
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-6">
                    {socia?.telefono ? (
                      <Button size="icon" variant="outline" className="h-9 w-9 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300" asChild title="WhatsApp">
                        <a href={`https://wa.me/52${socia.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${accion.socia_nombre || "socia"}, soy tu asesora del Reto Price Shoes`)}`} target="_blank" rel="noopener noreferrer">
                          <MessageSquare className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : (
                      <Button size="icon" variant="outline" className="h-9 w-9 opacity-40 cursor-not-allowed" disabled title="Sin teléfono">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" onClick={() => openModal("completar", accion)} title="Completar">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10" onClick={() => openModal("posponer", accion)} title="Posponer">
                      <Clock className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10" onClick={() => openModal("escalar", accion)} title="Escalar">
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openModal("nota", accion)} title="Nota">
                      <StickyNote className="h-4 w-4" />
                    </Button>
                  </div>
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
                <Button key={opt.val} variant={resultadoRapido === opt.val ? "default" : "outline"} size="sm" className="text-xs h-auto py-2 whitespace-normal" onClick={() => setResultadoRapido(opt.val)}>
                  {opt.label}
                </Button>
              ))}
            </div>
            <Textarea placeholder="Notas adicionales (mínimo 10 caracteres)..." value={comentario} onChange={(e) => setComentario(e.target.value)} className="min-h-[80px]" />
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
                <Button key={opt.val} variant={posponerOpcion === opt.val ? "default" : "outline"} size="sm" onClick={() => { setPosponerOpcion(opt.val); setPosponerFecha(undefined); }}>
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
                  <Calendar mode="single" selected={posponerFecha} onSelect={(d) => { setPosponerFecha(d); setPosponerOpcion("custom"); }} disabled={(d) => d < new Date()} className="p-3 pointer-events-auto" />
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
                  <SelectItem key={u.auth_id} value={u.auth_id}>{u.nombre} ({u.rol})</SelectItem>
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

      {/* Socia Ficha */}
      <SociaFicha
        sociaId={fichaOpen}
        retoId={acciones[0]?.reto_id || ""}
        open={!!fichaOpen}
        onClose={() => setFichaOpen(null)}
      />
    </div>
  );
}
