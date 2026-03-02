import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { countMatchingSocias, generateActionsForRule } from "@/lib/rules-engine";
import { toast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Copy, Trash2, Edit2, ArrowUp, ArrowDown, BookOpen, Loader2, MoreVertical } from "lucide-react";

const CAMPOS = [
  { value: "dias_sin_compra", label: "Días sin compra" },
  { value: "pct_avance", label: "% Avance" },
  { value: "venta_acumulada", label: "Venta acumulada" },
  { value: "venta_semanal", label: "Venta semanal" },
  { value: "estado", label: "Estado" },
  { value: "g_probable", label: "G probable" },
  { value: "primera_compra", label: "Primera compra (boolean)" },
  { value: "crediprice_activo", label: "CrediPrice activo (boolean)" },
];
const OPERADORES = [">=", "<=", "=", ">", "<"];
const TIPOS_ACCION = [
  { value: "contactar", label: "Contactar" },
  { value: "celebrar", label: "Celebrar" },
  { value: "escalar", label: "Escalar" },
  { value: "diagnosticar", label: "Diagnosticar" },
  { value: "seguimiento", label: "Seguimiento" },
];
const ROLES_ASIGNAR = [
  { value: "coordinador", label: "Coordinador" },
  { value: "desarrolladora", label: "Desarrolladora" },
  { value: "mentora", label: "Mentora" },
  { value: "gerente", label: "Gerente" },
];
const PRIORIDADES = [
  { value: "baja", label: "Baja", color: "bg-muted text-muted-foreground" },
  { value: "media", label: "Media", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "alta", label: "Alta", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { value: "urgente", label: "Urgente", color: "bg-red-500/20 text-red-400 border-red-500/30" },
];

const emptyForm = {
  nombre: "",
  campo: "dias_sin_compra",
  operador: ">=",
  valor: "",
  condicion_extra: false,
  campo2: "pct_avance",
  operador2: ">=",
  valor2: "",
  logica_extra: "AND",
  accion_tipo: "contactar",
  accion_mensaje: "",
  tactica_sugerida: "",
  asignar_a_rol: "coordinador",
  prioridad: "media",
  semanas_activas: [1, 2, 3, 4] as number[],
  activa: true,
};

const PREDEFINED_RULES = [
  { nombre: "Sin actividad día 1", campo: "venta_acumulada", operador: "=", valor: "0", condicion_extra: false, accion_tipo: "contactar", accion_mensaje: "Contactar a {nombre}: no ha registrado ninguna compra. Verificar que entienda el reto y tenga mentora activa.", asignar_a_rol: "desarrolladora", prioridad: "alta", semanas_activas: [1] },
  { nombre: "Primera compra", campo: "primera_compra", operador: "=", valor: "true", condicion_extra: false, accion_tipo: "celebrar", accion_mensaje: "¡Felicitar a {nombre} por su primera compra! Venta: ${venta_acumulada}. Reforzar el hábito y sugerir siguiente paso.", asignar_a_rol: "mentora", prioridad: "media", semanas_activas: [1,2,3,4] },
  { nombre: "Sin compra 3+ días", campo: "dias_sin_compra", operador: ">=", valor: "3", condicion_extra: false, accion_tipo: "contactar", accion_mensaje: "Contactar a {nombre}: lleva {dias_sin_compra} días sin comprar. Identificar obstáculo y ofrecer táctica de prospección.", asignar_a_rol: "coordinador", prioridad: "alta", semanas_activas: [1,2,3,4] },
  { nombre: "CrediPrice no activado", campo: "crediprice_activo", operador: "=", valor: "false", condicion_extra: true, campo2: "dias_sin_compra", operador2: ">=", valor2: "4", logica_extra: "AND", accion_tipo: "contactar", accion_mensaje: "Revisar CrediPrice con {nombre}. Lleva {dias_sin_compra} días sin compra y no tiene crédito activo. Explicar beneficio de capital de trabajo.", asignar_a_rol: "coordinador", prioridad: "media", semanas_activas: [1,2,3,4] },
  { nombre: "Inactiva 7+ días", campo: "dias_sin_compra", operador: ">=", valor: "7", condicion_extra: false, accion_tipo: "contactar", accion_mensaje: "URGENTE: {nombre} lleva {dias_sin_compra} días sin compra. Intervención requerida: coordinador + mentora. Evaluar si necesita cambio de estrategia.", asignar_a_rol: "coordinador", prioridad: "urgente", semanas_activas: [1,2,3,4] },
  { nombre: "Socia estrella", campo: "pct_avance", operador: ">=", valor: "80", condicion_extra: false, accion_tipo: "celebrar", accion_mensaje: "¡{nombre} va al {pct_avance}% de su meta! Celebrar logro y empujar para que cierre. Sugerir categoría nueva para diversificar.", asignar_a_rol: "mentora", prioridad: "media", semanas_activas: [2,3,4] },
  { nombre: "Socia consistente — upsell", campo: "pct_avance", operador: ">=", valor: "50", condicion_extra: false, accion_tipo: "contactar", accion_mensaje: "{nombre} va al {pct_avance}%. Tiene momentum. Sugerir categoría nueva o CrediPrice para acelerar.", asignar_a_rol: "mentora", prioridad: "media", semanas_activas: [2,3] },
  { nombre: "Sprint urgencia S4", campo: "pct_avance", operador: ">=", valor: "60", condicion_extra: true, campo2: "pct_avance", operador2: "<", valor2: "90", logica_extra: "AND", accion_tipo: "contactar", accion_mensaje: "Sprint final para {nombre}: va al {pct_avance}%. Necesita empujón coordinado entre coordinador + mentora para cerrar meta.", asignar_a_rol: "coordinador", prioridad: "alta", semanas_activas: [4] },
  { nombre: "Probable G3", campo: "pct_avance", operador: "<", valor: "30", condicion_extra: false, accion_tipo: "diagnosticar", accion_mensaje: "{nombre} va al {pct_avance}%. Probable G3. Evaluar: ¿prospecta? ¿publica? ¿asistió a talleres? Registrar patrón para siguiente reto.", asignar_a_rol: "coordinador", prioridad: "urgente", semanas_activas: [3,4] },
  { nombre: "Meta cumplida", campo: "pct_avance", operador: ">=", valor: "100", condicion_extra: false, accion_tipo: "celebrar", accion_mensaje: "🎉 ¡{nombre} cumplió su meta al {pct_avance}%! Celebrar públicamente y proponer meta extendida.", asignar_a_rol: "mentora", prioridad: "media", semanas_activas: [1,2,3,4] },
];

export default function ReglasMetodo() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [editingRegla, setEditingRegla] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loadingPredefined, setLoadingPredefined] = useState(false);
  const [confirmPredefined, setConfirmPredefined] = useState<false | "add" | "replace">(false);
  const [confirmMode, setConfirmMode] = useState<"ask" | "confirm">("ask");
  const [retroModal, setRetroModal] = useState<{ regla: any; count: number } | null>(null);
  const [generatingActions, setGeneratingActions] = useState(false);

  // Get active reto
  const { data: retoActivo } = useQuery({
    queryKey: ["reto-activo"],
    queryFn: async () => {
      const { data } = await supabase
        .from("retos")
        .select("*")
        .in("estado", ["activo", "publicado"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const retoId = retoActivo?.id;

  // Fetch reglas
  const { data: reglas = [] } = useQuery({
    queryKey: ["reglas-metodo", retoId],
    queryFn: async () => {
      if (!retoId) return [];
      const { data, error } = await supabase
        .from("reglas_metodo")
        .select("*")
        .eq("reto_id", retoId)
        .order("orden");
      if (error) throw error;
      return data || [];
    },
    enabled: !!retoId,
  });

  // Fetch socias for current reto (for rule evaluation)
  const { data: sociasList = [] } = useQuery({
    queryKey: ["socias-reto-reglas", retoId],
    queryFn: async () => {
      if (!retoId) return [];
      const { data, error } = await supabase
        .from("socias_reto")
        .select("*")
        .eq("reto_id", retoId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!retoId,
  });

  const visibleReglas = showInactive ? reglas : reglas.filter((r: any) => r.activa);

  const openNew = () => {
    setEditingRegla(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = (r: any) => {
    setEditingRegla(r);
    setForm({
      nombre: r.nombre,
      campo: r.campo,
      operador: r.operador,
      valor: r.valor,
      condicion_extra: r.condicion_extra || false,
      campo2: r.campo2 || "pct_avance",
      operador2: r.operador2 || ">=",
      valor2: r.valor2 || "",
      logica_extra: r.logica_extra || "AND",
      accion_tipo: r.accion_tipo,
      accion_mensaje: r.accion_mensaje,
      tactica_sugerida: r.tactica_sugerida || "",
      asignar_a_rol: r.asignar_a_rol,
      prioridad: r.prioridad,
      semanas_activas: r.semanas_activas || [1,2,3,4],
      activa: r.activa,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!retoId || !form.nombre || !form.valor) return;
    try {
      const payload = {
        reto_id: retoId,
        nombre: form.nombre,
        campo: form.campo,
        operador: form.operador,
        valor: form.valor,
        condicion_extra: form.condicion_extra,
        campo2: form.condicion_extra ? form.campo2 : null,
        operador2: form.condicion_extra ? form.operador2 : null,
        valor2: form.condicion_extra ? form.valor2 : null,
        logica_extra: form.condicion_extra ? form.logica_extra : null,
        accion_tipo: form.accion_tipo,
        accion_mensaje: form.accion_mensaje,
        tactica_sugerida: form.tactica_sugerida || null,
        asignar_a_rol: form.asignar_a_rol,
        prioridad: form.prioridad,
        semanas_activas: form.semanas_activas,
        activa: form.activa,
      };

      let savedRegla: any;
      if (editingRegla) {
        const { data } = await supabase.from("reglas_metodo").update(payload).eq("id", editingRegla.id).select().single();
        savedRegla = data;
      } else {
        const maxOrden = reglas.length > 0 ? Math.max(...reglas.map((r: any) => r.orden)) + 1 : 1;
        const { data } = await supabase.from("reglas_metodo").insert({ ...payload, orden: maxOrden }).select().single();
        savedRegla = data;
      }

      queryClient.invalidateQueries({ queryKey: ["reglas-metodo"] });
      setModalOpen(false);

      // Check if rule is active and matches existing socias
      if (savedRegla && payload.activa) {
        const matchCount = countMatchingSocias(savedRegla, sociasList);
        if (matchCount > 0) {
          setRetroModal({ regla: savedRegla, count: matchCount });
        } else {
          toast({ title: "Regla guardada", description: "Se evaluará en la próxima carga de ventas." });
        }
      } else {
        toast({ title: editingRegla ? "Regla actualizada" : "Regla creada" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleGenerateNow = async () => {
    if (!retroModal || !retoId || !user) return;
    setGeneratingActions(true);
    try {
      const count = await generateActionsForRule(retroModal.regla, retoId, sociasList, user.id);
      toast({
        title: `${count} acciones generadas`,
        description: "Ve a Cola de Trabajo para verlas.",
      });
      queryClient.invalidateQueries({ queryKey: ["cola-trabajo"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingActions(false);
      setRetroModal(null);
    }
  };

  const handleDuplicate = async (r: any) => {
    const maxOrden = reglas.length > 0 ? Math.max(...reglas.map((x: any) => x.orden)) + 1 : 1;
    const { id, created_at, updated_at, ...rest } = r;
    await supabase.from("reglas_metodo").insert({ ...rest, nombre: `${r.nombre} (copia)`, orden: maxOrden });
    queryClient.invalidateQueries({ queryKey: ["reglas-metodo"] });
    toast({ title: "Regla duplicada" });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from("reglas_metodo").delete().eq("id", deleteTarget);
    queryClient.invalidateQueries({ queryKey: ["reglas-metodo"] });
    setDeleteTarget(null);
    toast({ title: "Regla eliminada" });
  };

  const handleToggleActiva = async (r: any) => {
    const newActiva = !r.activa;
    await supabase.from("reglas_metodo").update({ activa: newActiva }).eq("id", r.id);
    queryClient.invalidateQueries({ queryKey: ["reglas-metodo"] });
    if (newActiva) {
      const updatedRegla = { ...r, activa: true };
      const matchCount = countMatchingSocias(updatedRegla, sociasList);
      if (matchCount > 0) {
        setRetroModal({ regla: updatedRegla, count: matchCount });
      }
    }
  };

  const handleMoveOrder = async (r: any, direction: "up" | "down") => {
    const idx = reglas.findIndex((x: any) => x.id === r.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= reglas.length) return;
    const other = reglas[swapIdx];
    await Promise.all([
      supabase.from("reglas_metodo").update({ orden: other.orden }).eq("id", r.id),
      supabase.from("reglas_metodo").update({ orden: r.orden }).eq("id", other.id),
    ]);
    queryClient.invalidateQueries({ queryKey: ["reglas-metodo"] });
  };

  const handleLoadPredefined = async (mode: "add" | "replace") => {
    if (!retoId) return;
    setLoadingPredefined(true);
    try {
      if (mode === "replace") {
        await supabase.from("acciones_operativas").delete().eq("reto_id", retoId);
        await supabase.from("reglas_metodo").delete().eq("reto_id", retoId);
      }
      const existingMax = mode === "replace" ? 0 : (reglas.length > 0 ? Math.max(...reglas.map((r: any) => r.orden)) : 0);
      const inserts = PREDEFINED_RULES.map((rule, i) => ({
        reto_id: retoId,
        orden: existingMax + i + 1,
        activa: true,
        campo2: null as string | null,
        operador2: null as string | null,
        valor2: null as string | null,
        logica_extra: null as string | null,
        tactica_sugerida: null as string | null,
        ...rule,
        ...(rule.condicion_extra ? { campo2: rule.campo2, operador2: rule.operador2, valor2: rule.valor2, logica_extra: rule.logica_extra } : {}),
      }));
      await supabase.from("reglas_metodo").insert(inserts);
      queryClient.invalidateQueries({ queryKey: ["reglas-metodo"] });
      toast({ title: "10 reglas del Método cargadas", description: "Puedes editarlas desde aquí." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingPredefined(false);
      setConfirmPredefined(false);
      setConfirmMode("ask");
    }
  };

  const formatCondition = (r: any) => {
    let cond = `${r.campo} ${r.operador} ${r.valor}`;
    if (r.condicion_extra && r.campo2) {
      cond += ` ${r.logica_extra || "AND"} ${r.campo2} ${r.operador2} ${r.valor2}`;
    }
    return cond;
  };

  const prioridadBadge = (p: string) => {
    const pr = PRIORIDADES.find((x) => x.value === p);
    return <Badge variant="outline" className={pr?.color || ""}>{pr?.label || p}</Badge>;
  };

  const toggleSemana = (s: number) => {
    setForm((f) => ({
      ...f,
      semanas_activas: f.semanas_activas.includes(s)
        ? f.semanas_activas.filter((x) => x !== s)
        : [...f.semanas_activas, s].sort(),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reglas del Método</h1>
          <p className="text-sm text-muted-foreground">
            {retoActivo ? `Reglas activas para: ${retoActivo.nombre}` : "No hay reto activo"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} id="show-inactive" />
            <Label htmlFor="show-inactive" className="text-xs text-muted-foreground">Mostrar inactivas</Label>
          </div>
          <Button variant="outline" onClick={() => {
            if (reglas.length > 0) { setConfirmMode("ask"); } else { setConfirmMode("confirm"); }
            setConfirmPredefined("add");
          }} disabled={!retoId || loadingPredefined}>
            <BookOpen className="mr-1.5 h-4 w-4" /> Cargar plantilla
          </Button>
          <Button onClick={openNew} disabled={!retoId}>
            <Plus className="mr-1.5 h-4 w-4" /> Nueva Regla
          </Button>
        </div>
      </div>

      {/* Rules table */}
      {!retoId ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          No hay reto activo. Las reglas se configuran por reto.
        </div>
      ) : visibleReglas.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          No hay reglas {showInactive ? "" : "activas "}configuradas. Crea una nueva o carga la plantilla del Método.
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Orden</TableHead>
                <TableHead className="min-w-[140px]">Nombre</TableHead>
                <TableHead>Condición</TableHead>
                <TableHead className="w-[90px]">Asignar a</TableHead>
                <TableHead className="w-[80px]">Prioridad</TableHead>
                <TableHead className="w-[100px]">Semanas</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleReglas.map((r: any, idx: number) => (
                <TableRow key={r.id} className={!r.activa ? "opacity-50" : ""}>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground text-xs w-4">{r.orden}</span>
                      <div className="flex flex-col">
                        <button onClick={() => handleMoveOrder(r, "up")} className="text-muted-foreground hover:text-foreground" disabled={idx === 0}>
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button onClick={() => handleMoveOrder(r, "down")} className="text-muted-foreground hover:text-foreground" disabled={idx === visibleReglas.length - 1}>
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    <div className="truncate max-w-[160px]">{r.nombre}</div>
                    <div className="text-[10px] text-muted-foreground capitalize">{r.accion_tipo}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono max-w-[220px] truncate">{formatCondition(r)}</TableCell>
                  <TableCell className="text-xs capitalize">{r.asignar_a_rol}</TableCell>
                  <TableCell>{prioridadBadge(r.prioridad)}</TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      {[1,2,3,4].map((s) => (
                        <Badge key={s} variant="outline" className={`text-[10px] px-1 ${r.semanas_activas?.includes(s) ? "bg-primary/20 text-primary border-primary/30" : "opacity-30"}`}>
                          S{s}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(r)}>
                          <Edit2 className="mr-2 h-3.5 w-3.5" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(r)}>
                          <Copy className="mr-2 h-3.5 w-3.5" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActiva(r)}>
                          {r.activa ? "Desactivar" : "Activar"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(r.id)}>
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Confirm predefined */}
      <AlertDialog open={!!confirmPredefined} onOpenChange={(o) => { if (!o) { setConfirmPredefined(false); setConfirmMode("ask"); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            {reglas.length > 0 && confirmMode === "ask" ? (
              <>
                <AlertDialogTitle>Este reto ya tiene {reglas.length} reglas</AlertDialogTitle>
                <AlertDialogDescription>
                  ¿Agregar las 10 reglas de la plantilla o reemplazar todas las existentes?
                </AlertDialogDescription>
              </>
            ) : (
              <>
                <AlertDialogTitle>¿Cargar 10 reglas base del Método?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se agregarán 10 reglas base del Método. Puedes editarlas después.
                </AlertDialogDescription>
              </>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {reglas.length > 0 && confirmMode === "ask" ? (
              <>
                <Button variant="outline" onClick={() => handleLoadPredefined("add")} disabled={loadingPredefined}>
                  {loadingPredefined && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Agregar
                </Button>
                <Button variant="destructive" onClick={() => handleLoadPredefined("replace")} disabled={loadingPredefined}>
                  {loadingPredefined && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Reemplazar todas
                </Button>
              </>
            ) : (
              <AlertDialogAction onClick={() => handleLoadPredefined("add")} disabled={loadingPredefined}>
                {loadingPredefined && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Cargar 10 reglas
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta regla?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Retroactive actions modal */}
      <AlertDialog open={!!retroModal} onOpenChange={(o) => !o && setRetroModal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regla aplica a socias existentes</AlertDialogTitle>
            <AlertDialogDescription>
              Esta regla aplica a <strong>{retroModal?.count}</strong> socias que ya cumplen la condición hoy. ¿Qué quieres hacer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setRetroModal(null)} disabled={generatingActions}>
              Solo aplicar en próximas cargas
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleGenerateNow} disabled={generatingActions}>
              {generatingActions && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Generar acciones ahora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRegla ? "Editar Regla" : "Nueva Regla"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Inactividad 3 días → contactar" value={form.nombre} onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>

            {/* Condition */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Condición</Label>
              <div className="flex gap-2">
                <Select value={form.campo} onValueChange={(v) => setForm(f => ({ ...f, campo: v }))}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{CAMPOS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.operador} onValueChange={(v) => setForm(f => ({ ...f, operador: v }))}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>{OPERADORES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
                <Input className="w-24" placeholder="Valor" value={form.valor} onChange={(e) => setForm(f => ({ ...f, valor: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={form.condicion_extra} onCheckedChange={(c) => setForm(f => ({ ...f, condicion_extra: !!c }))} id="extra-cond" />
                <Label htmlFor="extra-cond" className="text-xs">Condición adicional</Label>
              </div>
              {form.condicion_extra && (
                <div className="flex gap-2">
                  <Select value={form.logica_extra} onValueChange={(v) => setForm(f => ({ ...f, logica_extra: v }))}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={form.campo2} onValueChange={(v) => setForm(f => ({ ...f, campo2: v }))}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{CAMPOS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={form.operador2} onValueChange={(v) => setForm(f => ({ ...f, operador2: v }))}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>{OPERADORES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input className="w-24" placeholder="Valor" value={form.valor2} onChange={(e) => setForm(f => ({ ...f, valor2: e.target.value }))} />
                </div>
              )}
            </div>

            {/* Action */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acción</Label>
              <Select value={form.accion_tipo} onValueChange={(v) => setForm(f => ({ ...f, accion_tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS_ACCION.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
              <Textarea placeholder="Ej: Contactar socia inactiva {dias_sin_compra} días." value={form.accion_mensaje} onChange={(e) => setForm(f => ({ ...f, accion_mensaje: e.target.value }))} rows={2} />
              <Input placeholder="Táctica sugerida (opcional)" value={form.tactica_sugerida} onChange={(e) => setForm(f => ({ ...f, tactica_sugerida: e.target.value }))} />
            </div>

            {/* Assignment */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Asignación</Label>
              <div className="flex gap-2">
                <Select value={form.asignar_a_rol} onValueChange={(v) => setForm(f => ({ ...f, asignar_a_rol: v }))}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES_ASIGNAR.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.prioridad} onValueChange={(v) => setForm(f => ({ ...f, prioridad: v }))}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORIDADES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Control */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Control</Label>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Semanas:</span>
                {[1,2,3,4].map(s => (
                  <div key={s} className="flex items-center gap-1">
                    <Checkbox checked={form.semanas_activas.includes(s)} onCheckedChange={() => toggleSemana(s)} id={`s${s}`} />
                    <Label htmlFor={`s${s}`} className="text-xs">S{s}</Label>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.activa} onCheckedChange={(v) => setForm(f => ({ ...f, activa: v }))} id="activa" />
                <Label htmlFor="activa" className="text-sm">Activa</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.nombre || !form.valor}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
