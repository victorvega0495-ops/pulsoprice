import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import { Plus, Copy, Trash2, Edit2, ArrowUp, ArrowDown, BookOpen, Loader2 } from "lucide-react";

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
  { value: "operador", label: "Operador" },
  { value: "mentora", label: "Mentora" },
  { value: "call_center", label: "Call Center" },
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
  asignar_a_rol: "operador",
  prioridad: "media",
  semanas_activas: [1, 2, 3, 4] as number[],
  activa: true,
};

const PREDEFINED_RULES = [
  { nombre: "Primera compra → celebrar", campo: "primera_compra", operador: "=", valor: "true", condicion_extra: false, accion_tipo: "celebrar", accion_mensaje: "¡{nombre} hizo su primera compra! Celebrar y reforzar el hábito.", asignar_a_rol: "mentora", prioridad: "alta", semanas_activas: [1,2,3,4] },
  { nombre: "Inactividad 3 días → contactar", campo: "dias_sin_compra", operador: ">=", valor: "3", condicion_extra: false, accion_tipo: "contactar", accion_mensaje: "Socia lleva {dias_sin_compra} días sin compra. Contactar para identificar obstáculo.", asignar_a_rol: "operador", prioridad: "alta", semanas_activas: [1,2,3,4] },
  { nombre: "Inactividad 5 días → escalar", campo: "dias_sin_compra", operador: ">=", valor: "5", condicion_extra: false, accion_tipo: "escalar", accion_mensaje: "Socia lleva {dias_sin_compra} días sin compra. Requiere intervención directa.", asignar_a_rol: "gerente", prioridad: "urgente", semanas_activas: [1,2,3,4] },
  { nombre: "Avance > 80% → reforzar", campo: "pct_avance", operador: ">=", valor: "80", condicion_extra: false, accion_tipo: "celebrar", accion_mensaje: "Socia va al {pct_avance}% de su meta. Celebrar y motivar para superar.", asignar_a_rol: "mentora", prioridad: "media", semanas_activas: [2,3,4] },
  { nombre: "Avance < 25% en S2 → diagnosticar", campo: "pct_avance", operador: "<", valor: "25", condicion_extra: false, accion_tipo: "diagnosticar", accion_mensaje: "Socia va al {pct_avance}% en semana 2+. Diagnosticar causa y ajustar plan.", asignar_a_rol: "operador", prioridad: "alta", semanas_activas: [2,3] },
  { nombre: "G3 probable → intervención", campo: "g_probable", operador: "=", valor: "G3", condicion_extra: false, accion_tipo: "contactar", accion_mensaje: "Socia clasificada como G3 probable. Intervención necesaria antes de que sea definitivo.", asignar_a_rol: "operador", prioridad: "urgente", semanas_activas: [3,4] },
  { nombre: "Sin CrediPrice + inactiva → ofrecer", campo: "crediprice_activo", operador: "=", valor: "false", condicion_extra: true, campo2: "dias_sin_compra", operador2: ">=", valor2: "2", logica_extra: "AND", accion_tipo: "contactar", accion_mensaje: "Socia sin CrediPrice y con {dias_sin_compra} días sin compra. Ofrecer capital de trabajo.", asignar_a_rol: "operador", prioridad: "media", semanas_activas: [1,2] },
  { nombre: "Venta semanal alta → reconocer", campo: "venta_semanal", operador: ">=", valor: "10000", condicion_extra: false, accion_tipo: "celebrar", accion_mensaje: "Socia vendió ${venta_semanal} esta semana. Reconocer públicamente en grupo.", asignar_a_rol: "mentora", prioridad: "media", semanas_activas: [1,2,3,4] },
];

export default function ReglasMetodo() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [editingRegla, setEditingRegla] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loadingPredefined, setLoadingPredefined] = useState(false);
  const [confirmPredefined, setConfirmPredefined] = useState(false);

  // Get active reto
  const { data: retoActivo } = useQuery({
    queryKey: ["reto-activo"],
    queryFn: async () => {
      const { data } = await supabase
        .from("retos")
        .select("*")
        .eq("estado", "publicado")
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

      if (editingRegla) {
        await supabase.from("reglas_metodo").update(payload).eq("id", editingRegla.id);
      } else {
        const maxOrden = reglas.length > 0 ? Math.max(...reglas.map((r: any) => r.orden)) + 1 : 1;
        await supabase.from("reglas_metodo").insert({ ...payload, orden: maxOrden });
      }

      toast({ title: editingRegla ? "Regla actualizada" : "Regla creada" });
      queryClient.invalidateQueries({ queryKey: ["reglas-metodo"] });
      setModalOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
    await supabase.from("reglas_metodo").update({ activa: !r.activa }).eq("id", r.id);
    queryClient.invalidateQueries({ queryKey: ["reglas-metodo"] });
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

  const handleLoadPredefined = async () => {
    if (!retoId) return;
    setLoadingPredefined(true);
    try {
      const startOrden = reglas.length > 0 ? Math.max(...reglas.map((r: any) => r.orden)) + 1 : 1;
      const inserts = PREDEFINED_RULES.map((rule, i) => ({
        reto_id: retoId,
        orden: startOrden + i,
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
      toast({ title: "8 reglas predefinidas cargadas" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingPredefined(false);
      setConfirmPredefined(false);
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
          No hay reglas {showInactive ? "" : "activas "}configuradas. Crea una nueva o carga las predefinidas.
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Orden</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Condición</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Asignar a</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Semanas</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleReglas.map((r: any, idx: number) => (
                <TableRow key={r.id} className={!r.activa ? "opacity-50" : ""}>
                  <TableCell>
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
                  <TableCell className="font-medium max-w-[180px] truncate">{r.nombre}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono max-w-[200px] truncate">{formatCondition(r)}</TableCell>
                  <TableCell className="text-xs capitalize">{r.accion_tipo}</TableCell>
                  <TableCell className="text-xs capitalize">{r.asignar_a_rol}</TableCell>
                  <TableCell>{prioridadBadge(r.prioridad)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {[1,2,3,4].map((s) => (
                        <Badge key={s} variant="outline" className={`text-[10px] px-1 ${r.semanas_activas?.includes(s) ? "bg-primary/20 text-primary border-primary/30" : "opacity-30"}`}>
                          S{s}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={r.activa} onCheckedChange={() => handleToggleActiva(r)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDuplicate(r)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Predefined rules */}
      {retoId && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setConfirmPredefined(true)} disabled={loadingPredefined}>
            <BookOpen className="mr-1.5 h-4 w-4" />
            Cargar reglas predefinidas del Método
          </Button>
        </div>
      )}

      {/* Confirm predefined */}
      <AlertDialog open={confirmPredefined} onOpenChange={setConfirmPredefined}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cargar reglas predefinidas?</AlertDialogTitle>
            <AlertDialogDescription>
              Se agregarán 8 reglas base del Método de Desarrollo de Ventas a las reglas existentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLoadPredefined} disabled={loadingPredefined}>
              {loadingPredefined && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Cargar 8 reglas
            </AlertDialogAction>
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
