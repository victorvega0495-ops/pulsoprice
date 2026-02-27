import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, AlertTriangle, MoreVertical, Edit2, RefreshCw, Trash2, Copy, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const estadoBadge: Record<string, { label: string; className: string }> = {
  borrador: { label: "Borrador", className: "bg-muted text-muted-foreground" },
  publicado: { label: "Publicado", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  activo: { label: "Activo", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  en_cierre: { label: "En cierre", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  cerrado: { label: "Cerrado", className: "bg-zinc-700/50 text-zinc-300 border-zinc-600/30" },
  cancelado: { label: "Cancelado", className: "bg-destructive/20 text-destructive border-destructive/30" },
};

const VALID_TRANSITIONS: Record<string, { target: string; label: string; description: string; needsSocias?: boolean }[]> = {
  borrador: [
    { target: "publicado", label: "Publicar", description: "El reto será visible y se podrán cargar ventas. Las socias pasarán a estado 'inscrita'.", needsSocias: true },
    { target: "cancelado", label: "Cancelar", description: "El reto será cancelado y no se podrá reactivar." },
  ],
  publicado: [
    { target: "activo", label: "Activar", description: "El reto pasará a estado activo. Se habilitará la carga de ventas y las socias pasarán a 'activa'." },
    { target: "cancelado", label: "Cancelar", description: "El reto será cancelado." },
  ],
  activo: [
    { target: "en_cierre", label: "Iniciar cierre", description: "Se calculará la clasificación G y se prepararán las graduaciones." },
  ],
  en_cierre: [
    { target: "cerrado", label: "Cerrar definitivamente", description: "Las socias serán graduadas/no graduadas según su avance. No se podrá reabrir." },
  ],
};

export default function GestionRetos() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const isManager = profile?.rol === "director" || profile?.rol === "gerente";

  const [editReto, setEditReto] = useState<any>(null);
  const [editForm, setEditForm] = useState({ nombre: "", fecha_inicio: undefined as Date | undefined, fecha_fin: undefined as Date | undefined, meta_estandar: 0 });
  const [deleteReto, setDeleteReto] = useState<any>(null);
  const [transitionReto, setTransitionReto] = useState<any>(null);
  const [transitionTarget, setTransitionTarget] = useState<{ target: string; label: string; description: string } | null>(null);
  const [duplicateReto, setDuplicateReto] = useState<any>(null);

  const { data: retos = [], isLoading } = useQuery({
    queryKey: ["todos-retos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("retos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: sociasCounts = {} } = useQuery({
    queryKey: ["socias-count-by-reto"],
    queryFn: async () => {
      const { data } = await supabase.from("socias_reto").select("reto_id");
      if (!data) return {};
      const counts: Record<string, number> = {};
      data.forEach((s) => { counts[s.reto_id] = (counts[s.reto_id] || 0) + 1; });
      return counts;
    },
  });

  // Removed single-active restriction

  const openEdit = (r: any) => {
    setEditReto(r);
    setEditForm({
      nombre: r.nombre,
      fecha_inicio: new Date(r.fecha_inicio),
      fecha_fin: new Date(r.fecha_fin),
      meta_estandar: Number(r.meta_estandar),
    });
  };

  const handleSaveEdit = async () => {
    if (!editReto) return;
    const { error } = await supabase.from("retos").update({
      nombre: editForm.nombre,
      ...(["borrador", "publicado"].includes(editReto.estado) ? {
        fecha_inicio: editForm.fecha_inicio ? format(editForm.fecha_inicio, "yyyy-MM-dd") : editReto.fecha_inicio,
        fecha_fin: editForm.fecha_fin ? format(editForm.fecha_fin, "yyyy-MM-dd") : editReto.fecha_fin,
      } : {}),
      meta_estandar: editForm.meta_estandar,
    }).eq("id", editReto.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Reto actualizado" });
    queryClient.invalidateQueries({ queryKey: ["todos-retos"] });
    setEditReto(null);
  };

  const handleTransition = async () => {
    if (!transitionReto || !transitionTarget) return;
    const { error } = await supabase.from("retos").update({ estado: transitionTarget.target as any }).eq("id", transitionReto.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Reto → ${transitionTarget.label}` });
    queryClient.invalidateQueries({ queryKey: ["todos-retos"] });
    setTransitionReto(null);
    setTransitionTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteReto) return;
    // Cascade delete related data - all dependent tables
    await supabase.from("acciones_operativas").delete().eq("reto_id", deleteReto.id);
    await supabase.from("ventas_diarias").delete().eq("reto_id", deleteReto.id);
    await supabase.from("cargas_ventas").delete().eq("reto_id", deleteReto.id);
    await supabase.from("alertas").delete().eq("reto_id", deleteReto.id);
    await supabase.from("reglas_metodo").delete().eq("reto_id", deleteReto.id);
    await supabase.from("metas_diarias_reto").delete().eq("reto_id", deleteReto.id);
    await supabase.from("score_mentoras").delete().eq("reto_id", deleteReto.id);
    await supabase.from("compromisos_mentora").delete().eq("reto_id", deleteReto.id);
    await supabase.from("socias_reto").delete().eq("reto_id", deleteReto.id);
    const { error } = await supabase.from("retos").delete().eq("id", deleteReto.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Reto eliminado permanentemente" });
    queryClient.invalidateQueries({ queryKey: ["todos-retos"] });
    setDeleteReto(null);
  };

  const handleDuplicate = async () => {
    if (!duplicateReto) return;
    const r = duplicateReto;
    const { error } = await supabase.from("retos").insert({
      nombre: `${r.nombre} (copia)`,
      fecha_inicio: r.fecha_inicio,
      fecha_fin: r.fecha_fin,
      meta_estandar: r.meta_estandar,
      tipo_meta: r.tipo_meta,
      tipo_reto: (r as any).tipo_reto || "operacion",
      pesos_semanales: r.pesos_semanales,
      pesos_diarios: r.pesos_diarios,
      tiendas: r.tiendas,
      created_by: profile?.auth_id || r.created_by,
      estado: "borrador" as any,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setDuplicateReto(null); return; }
    // Duplicate reglas
    const { data: reglas } = await supabase.from("reglas_metodo").select("*").eq("reto_id", r.id);
    if (reglas && reglas.length > 0) {
      const { data: newReto } = await supabase.from("retos").select("id").eq("nombre", `${r.nombre} (copia)`).order("created_at", { ascending: false }).limit(1).single();
      if (newReto) {
        const inserts = reglas.map(({ id, created_at, updated_at, reto_id, ...rest }) => ({ ...rest, reto_id: newReto.id }));
        await supabase.from("reglas_metodo").insert(inserts);
      }
    }
    toast({ title: "Reto duplicado correctamente", description: `"${r.nombre} (copia)" creado en estado borrador` });
    queryClient.invalidateQueries({ queryKey: ["todos-retos"] });
    setDuplicateReto(null);
  };

  const datesEditable = editReto && ["borrador", "publicado"].includes(editReto.estado);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Retos</h1>
          <p className="text-sm text-muted-foreground">{retos.length} retos en el sistema</p>
        </div>
        <Button onClick={() => navigate("/nuevo-reto")}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Reto
        </Button>
      </div>


      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fechas</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right"># Socias</TableHead>
              <TableHead className="text-right">Meta Estándar</TableHead>
              {isManager && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {retos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">No hay retos creados aún</TableCell>
              </TableRow>
            ) : (
              retos.map((r) => {
                const badge = estadoBadge[r.estado] || estadoBadge.borrador;
                const transitions = VALID_TRANSITIONS[r.estado] || [];
                const canDelete = ["borrador", "cancelado"].includes(r.estado);
                const socCount = sociasCounts[r.id] || 0;
                return (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-accent/50" onClick={() => navigate("/reto-activo")}>
                    <TableCell className="font-medium">{r.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={(r as any).tipo_reto === "seguimiento" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"}>
                        {(r as any).tipo_reto === "seguimiento" ? "Seguimiento" : "Operación"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(r.fecha_inicio), "d MMM", { locale: es })} — {format(new Date(r.fecha_fin), "d MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell><Badge variant="outline" className={badge.className}>{badge.label}</Badge></TableCell>
                    <TableCell className="text-right">{socCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${Number(r.meta_estandar).toLocaleString()}</TableCell>
                    {isManager && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(r)}>
                              <Edit2 className="mr-2 h-3.5 w-3.5" /> Editar
                            </DropdownMenuItem>
                            {transitions.map((t) => (
                              <DropdownMenuItem key={t.target} onClick={() => { setTransitionReto(r); setTransitionTarget(t); }}
                                disabled={t.needsSocias && socCount === 0}
                              >
                                <RefreshCw className="mr-2 h-3.5 w-3.5" /> {t.label}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem onClick={() => setDuplicateReto(r)}>
                              <Copy className="mr-2 h-3.5 w-3.5" /> Duplicar
                            </DropdownMenuItem>
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteReto(r)}>
                                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editReto} onOpenChange={(o) => !o && setEditReto(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Reto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={editForm.nombre} onChange={(e) => setEditForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha inicio</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editForm.fecha_inicio && "text-muted-foreground")} disabled={!datesEditable}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editForm.fecha_inicio ? format(editForm.fecha_inicio, "d MMM yyyy", { locale: es }) : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={editForm.fecha_inicio} onSelect={(d) => setEditForm(f => ({ ...f, fecha_inicio: d }))} className="pointer-events-auto" /></PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>Fecha fin</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editForm.fecha_fin && "text-muted-foreground")} disabled={!datesEditable}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editForm.fecha_fin ? format(editForm.fecha_fin, "d MMM yyyy", { locale: es }) : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={editForm.fecha_fin} onSelect={(d) => setEditForm(f => ({ ...f, fecha_fin: d }))} className="pointer-events-auto" /></PopoverContent>
                </Popover>
              </div>
            </div>
            {!datesEditable && <p className="text-xs text-muted-foreground">Las fechas no se pueden editar en estado {editReto?.estado}</p>}
            <div className="space-y-1.5">
              <Label>Meta estándar</Label>
              <Input type="number" value={editForm.meta_estandar} onChange={(e) => setEditForm(f => ({ ...f, meta_estandar: Number(e.target.value) }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditReto(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transition Confirmation */}
      <AlertDialog open={!!transitionTarget} onOpenChange={(o) => { if (!o) { setTransitionReto(null); setTransitionTarget(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿{transitionTarget?.label} "{transitionReto?.nombre}"?</AlertDialogTitle>
            <AlertDialogDescription>{transitionTarget?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleTransition}>{transitionTarget?.label}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteReto} onOpenChange={(o) => !o && setDeleteReto(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> ¿Eliminar "{deleteReto?.nombre}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-destructive/80">
              ⚠️ Esto eliminará permanentemente el reto y todos sus datos ({sociasCounts[deleteReto?.id] || 0} socias, acciones, ventas, cargas, reglas, scores). Esta acción NO se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar permanentemente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Confirmation */}
      <AlertDialog open={!!duplicateReto} onOpenChange={(o) => !o && setDuplicateReto(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Duplicar "{duplicateReto?.nombre}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Se copiará la configuración y reglas del reto sin socias. El nuevo reto se creará en estado borrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDuplicate}>Duplicar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
