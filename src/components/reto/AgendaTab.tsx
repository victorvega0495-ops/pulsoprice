import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarDays, Pencil, Plus, Trash2, Loader2 } from "lucide-react";

interface Props {
  reto: any;
  diaActual: number;
  semanaActual: number;
}

const DIAS_SEMANA_LABELS: Record<string, string> = {
  lunes: "Lunes", martes: "Martes", miercoles: "Miércoles",
  jueves: "Jueves", viernes: "Viernes", sabado_domingo: "Sáb-Dom",
};

export function AgendaTab({ reto, diaActual, semanaActual }: Props) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState(semanaActual > 0 ? semanaActual : 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [editDay, setEditDay] = useState<any>(null);
  const [showConfirmLoad, setShowConfirmLoad] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addNew, setAddNew] = useState(false);

  const isManager = profile?.rol === "director" || profile?.rol === "gerente";

  const { data: agenda = [], isLoading } = useQuery({
    queryKey: ["agenda-metodo", reto.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_metodo")
        .select("*")
        .eq("reto_id", reto.id)
        .order("dia_numero");
      if (error) throw error;
      return data || [];
    },
  });

  const weekDays = agenda.filter((d: any) => d.semana === selectedWeek);
  const currentDayData = selectedDay !== null
    ? agenda.find((d: any) => d.dia_numero === selectedDay)
    : agenda.find((d: any) => d.dia_numero === diaActual);
  const displayDay = currentDayData || weekDays[0];

  const getRoleContent = () => {
    if (!displayDay) return null;
    const rol = profile?.rol;
    if (rol === "coordinador") return [{ label: "Tu agenda hoy (Coordinador)", text: displayDay.rol_coordinador }];
    if (rol === "desarrolladora") return [{ label: "Tu agenda hoy (Desarrolladora)", text: displayDay.rol_desarrolladora }];
    if (rol === "mentora") return [{ label: "Tu agenda hoy (Mentora)", text: displayDay.rol_mentora }];
    // gerente/director: show all
    return [
      { label: "Coordinador", text: displayDay.rol_coordinador },
      { label: "Desarrolladora", text: displayDay.rol_desarrolladora },
      { label: "Mentora", text: displayDay.rol_mentora },
    ];
  };

  const handleLoadTemplate = async () => {
    setLoading(true);
    try {
      const days = TEMPLATE_DAYS.map(d => ({ ...d, reto_id: reto.id }));
      const { error } = await supabase.from("agenda_metodo").insert(days);
      if (error) throw error;
      toast({ title: "Agenda cargada", description: "29 días del Método cargados. Puedes editarlos." });
      queryClient.invalidateQueries({ queryKey: ["agenda-metodo", reto.id] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setShowConfirmLoad(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editDay) return;
    setLoading(true);
    try {
      const actividades = typeof editDay.actividades === "string"
        ? editDay.actividades.split("\n").filter((l: string) => l.trim())
        : editDay.actividades;

      if (editDay.id) {
        const { error } = await supabase.from("agenda_metodo").update({
          titulo: editDay.titulo, descripcion: editDay.descripcion,
          actividades, tarea_socia: editDay.tarea_socia,
          rol_coordinador: editDay.rol_coordinador,
          rol_desarrolladora: editDay.rol_desarrolladora,
          rol_mentora: editDay.rol_mentora,
        }).eq("id", editDay.id);
        if (error) throw error;
        toast({ title: "Día actualizado" });
      } else {
        const { error } = await supabase.from("agenda_metodo").insert({
          reto_id: reto.id, dia_numero: editDay.dia_numero, semana: editDay.semana,
          dia_semana: editDay.dia_semana, titulo: editDay.titulo, descripcion: editDay.descripcion,
          actividades, tarea_socia: editDay.tarea_socia,
          rol_coordinador: editDay.rol_coordinador,
          rol_desarrolladora: editDay.rol_desarrolladora,
          rol_mentora: editDay.rol_mentora,
        });
        if (error) throw error;
        toast({ title: "Día agregado" });
      }
      queryClient.invalidateQueries({ queryKey: ["agenda-metodo", reto.id] });
      setEditDay(null);
      setAddNew(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleDeleteDay = async (id: string) => {
    const { error } = await supabase.from("agenda_metodo").delete().eq("id", id);
    if (!error) {
      toast({ title: "Día eliminado" });
      queryClient.invalidateQueries({ queryKey: ["agenda-metodo", reto.id] });
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  // Empty state
  if (agenda.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Sin agenda configurada</h3>
        <p className="text-sm text-muted-foreground mb-6">Carga el programa de 4 semanas del Método para comenzar</p>
        {isManager && (
          <Button onClick={() => setShowConfirmLoad(true)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarDays className="h-4 w-4 mr-2" />}
            Cargar programa de 4 semanas
          </Button>
        )}
        <AlertDialog open={showConfirmLoad} onOpenChange={setShowConfirmLoad}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cargar agenda del Método?</AlertDialogTitle>
              <AlertDialogDescription>Se insertarán 29 días con el programa completo de 4 semanas. Puedes editarlos después.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleLoadTemplate}>Cargar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  const roleContent = getRoleContent();

  return (
    <div className="space-y-6">
      {/* Banner principal */}
      {displayDay && (
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                📅 Día {displayDay.dia_numero} / Semana {displayDay.semana} — {DIAS_SEMANA_LABELS[displayDay.dia_semana] || displayDay.dia_semana}: {displayDay.titulo}
              </h3>
              {displayDay.descripcion && <p className="text-sm text-muted-foreground mt-1">{displayDay.descripcion}</p>}
            </div>
            {isManager && (
              <Button size="icon" variant="ghost" onClick={() => setEditDay({
                ...displayDay,
                actividades: Array.isArray(displayDay.actividades) ? (displayDay.actividades as string[]).join("\n") : "",
              })}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Actividades */}
          {displayDay.actividades && Array.isArray(displayDay.actividades) && (displayDay.actividades as string[]).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Actividades del día</p>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {(displayDay.actividades as string[]).map((a: string, i: number) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          {/* Tarea socia */}
          {displayDay.tarea_socia && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs font-semibold text-primary mb-1">🎯 Tarea del día para las socias</p>
              <p className="text-sm">{displayDay.tarea_socia}</p>
            </div>
          )}
        </div>
      )}

      {/* Tu agenda hoy */}
      {roleContent && roleContent.some(r => r.text) && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h4 className="text-sm font-semibold">👤 Tu agenda hoy</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            {roleContent.filter(r => r.text).map((r, i) => (
              <div key={i} className="rounded-md border p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">{r.label}</p>
                <p className="text-sm">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week selector */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map(w => (
          <Button key={w} size="sm" variant={selectedWeek === w ? "default" : "outline"}
            onClick={() => { setSelectedWeek(w); setSelectedDay(null); }}>
            S{w}
          </Button>
        ))}
        {isManager && (
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => {
            const maxDia = agenda.length > 0 ? Math.max(...agenda.map((d: any) => d.dia_numero)) : 0;
            setEditDay({
              dia_numero: maxDia + 1, semana: selectedWeek, dia_semana: "lunes",
              titulo: "", descripcion: "", actividades: "", tarea_socia: "",
              rol_coordinador: "", rol_desarrolladora: "", rol_mentora: "",
            });
            setAddNew(true);
          }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar día
          </Button>
        )}
      </div>

      {/* Weekly cards */}
      <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        {weekDays.map((d: any) => {
          const isToday = d.dia_numero === diaActual;
          const isSelected = d.dia_numero === (selectedDay ?? diaActual);
          return (
            <Card key={d.id} className={`cursor-pointer transition-all hover:border-primary/50 ${isSelected ? "border-primary ring-1 ring-primary/30" : ""} ${isToday ? "bg-primary/5" : ""}`}
              onClick={() => setSelectedDay(d.dia_numero)}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant={isToday ? "default" : "outline"} className="text-[10px]">
                    D{d.dia_numero}
                  </Badge>
                  {isManager && (
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); handleDeleteDay(d.id); }}>
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  )}
                </div>
                <p className="text-xs font-medium truncate">{d.titulo}</p>
                <p className="text-[10px] text-muted-foreground">{DIAS_SEMANA_LABELS[d.dia_semana] || d.dia_semana}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editDay} onOpenChange={(open) => { if (!open) { setEditDay(null); setAddNew(false); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{addNew ? "Agregar día" : `Editar Día ${editDay?.dia_numero}`}</DialogTitle>
            <DialogDescription>
              {addNew ? "Agrega un nuevo día a la agenda del reto" : "Modifica los detalles de este día"}
            </DialogDescription>
          </DialogHeader>
          {editDay && (
            <div className="space-y-3">
              {addNew && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Día #</Label>
                    <Input type="number" value={editDay.dia_numero} onChange={e => setEditDay({ ...editDay, dia_numero: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Semana</Label>
                    <Input type="number" value={editDay.semana} onChange={e => setEditDay({ ...editDay, semana: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Día semana</Label>
                    <Input value={editDay.dia_semana} onChange={e => setEditDay({ ...editDay, dia_semana: e.target.value })} />
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs">Título</Label>
                <Input value={editDay.titulo} onChange={e => setEditDay({ ...editDay, titulo: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Descripción</Label>
                <Input value={editDay.descripcion || ""} onChange={e => setEditDay({ ...editDay, descripcion: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Actividades (una por línea)</Label>
                <Textarea rows={4} value={editDay.actividades || ""} onChange={e => setEditDay({ ...editDay, actividades: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Tarea de la socia</Label>
                <Textarea rows={2} value={editDay.tarea_socia || ""} onChange={e => setEditDay({ ...editDay, tarea_socia: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Rol Coordinador</Label>
                <Textarea rows={2} value={editDay.rol_coordinador || ""} onChange={e => setEditDay({ ...editDay, rol_coordinador: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Rol Desarrolladora</Label>
                <Textarea rows={2} value={editDay.rol_desarrolladora || ""} onChange={e => setEditDay({ ...editDay, rol_desarrolladora: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Rol Mentora</Label>
                <Textarea rows={2} value={editDay.rol_mentora || ""} onChange={e => setEditDay({ ...editDay, rol_mentora: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDay(null); setAddNew(false); }}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== TEMPLATE DATA =====
const TEMPLATE_DAYS = [
  // SEMANA 1 — ACTIVAR
  { dia_numero: 1, semana: 1, dia_semana: "lunes", titulo: "Kick-off", descripcion: "Evento de arranque del reto", actividades: ["Presentación del reto, metas, reglas, premios", "Verificar grupos WhatsApp: todas las socias agregadas, mentora presentada", "Video de presentación: cada mentora graba video para sus aprendices", "Comunicar meta individual"], tarea_socia: "Foto con perfil de cliente + subir 2 estados de WhatsApp con producto. No vender aún, solo mostrar.", rol_coordinador: "Verificar grupos completos", rol_desarrolladora: "Apoyo logístico kick-off. Comunicar capacitaciones y talleres", rol_mentora: "Video de presentación. Activar grupo WA" },
  { dia_numero: 2, semana: 1, dia_semana: "martes", titulo: "Clase: Finanzas + CrediPrice", descripcion: "Finanzas personales y CrediPrice", actividades: ["Clase digital en vivo: Finanzas personales y del negocio. Método 3C (65-30-5)", "Bloque CrediPrice: capital de trabajo 28 días, caso real de mentora", "Clase complementaria: Tendencias, Comfort, Vestir casual e importados"], tarea_socia: "Activar CrediPrice si no lo tiene + registrar 5 contactos nuevos a prospectar", rol_coordinador: "Bajar resultados inicio, detectar faltantes", rol_desarrolladora: "Crear plantillas Canva, tarjetas de presentación", rol_mentora: "Activar grupo WA, compartir tips" },
  { dia_numero: 3, semana: 1, dia_semana: "miercoles", titulo: "Prospección activa", descripcion: "Día de prospección pura", actividades: ["La socia ejecuta tácticas del catálogo: estados WA, publicaciones FB, contactar lista de 5", "Coordinador: revisa grupos, identifica socias no activadas", "Desarrolladora: envía contenido (videos, plantillas Canva)"], tarea_socia: "Contactar al menos 3 personas nuevas con producto. Registrar en grupo.", rol_coordinador: "Revisar grupos, identificar socias no activadas", rol_desarrolladora: "Enviar contenido: videos, plantillas Canva", rol_mentora: "Compartir tips, celebrar primera venta" },
  { dia_numero: 4, semana: 1, dia_semana: "jueves", titulo: "Taller presencial UM: Finanzas", descripcion: "Taller presencial en Universidad de la Mujer", actividades: ["Taller presencial UM: finanzas aplicadas al negocio", "Ejercicio práctico con números reales", "Las socias que asisten a talleres son las que mejor les va"], tarea_socia: "Calcular cuánto necesita vender esta semana para ir en línea con meta", rol_coordinador: "Talleres en tiendas", rol_desarrolladora: "Comunicar capacitaciones y talleres", rol_mentora: "Compartir tips, celebrar avances" },
  { dia_numero: 5, semana: 1, dia_semana: "viernes", titulo: "Mentoría: Prospección campo y digital", descripcion: "Sesión con mentora: De socia a empresaria", actividades: ["Mentora comparte sus canales de venta reales", "Ejercicio: socia identifica 3 lugares nuevos donde ofrecer producto", "Coordinador: 1:1 con mentoras, reporte S1 a Gerente"], tarea_socia: "Ejecutar al menos 1 táctica nueva de prospección este fin de semana", rol_coordinador: "1:1 con mentoras, reporte S1 a Gerente", rol_desarrolladora: "Contenido diario a grupos", rol_mentora: "Sesión 1:1 prospección con socias" },
  { dia_numero: 6, semana: 1, dia_semana: "sabado_domingo", titulo: "Ejecución", descripcion: "Días de venta", actividades: ["La socia aplica lo aprendido: publica en redes, contacta prospectos, cierra primeras ventas"], tarea_socia: "1 publicación en WhatsApp o cualquier plataforma mostrando producto real", rol_coordinador: "Monitorear avance", rol_desarrolladora: "Contenido de apoyo", rol_mentora: "Mensaje motivacional + check de avance en grupo" },

  // SEMANA 2 — VENDER
  { dia_numero: 8, semana: 2, dia_semana: "lunes", titulo: "Resultados S1 + Plan de acción", descripcion: "Análisis de resultados y planes por cluster", actividades: ["Llenar score mentora, revisar mejores resultados, identificar clusters", "Plan por cluster: Verdes ≥89% subir meta, Amarillas empujar, Naranjas llamadas, Rojas call center", "Clase: De Socia a Influencer — marca personal"], tarea_socia: "Calcular cuánto le falta y cuánto necesita vender por día", rol_coordinador: "Resultados S1, score, planes de acción. Estrategia de premios por cluster", rol_desarrolladora: "Llamar socias <60% cumplimiento. Sondear: ¿publican? ¿prospectan?", rol_mentora: "Empujar volumen. Compartir tips de venta reales" },
  { dia_numero: 9, semana: 2, dia_semana: "martes", titulo: "1:1 con mentoras + Clase producto", descripcion: "Juntas individuales y clase de electrónica", actividades: ["Junta 1:1 con cada mentora: resultados, casos estrella, pendientes", "Clase digital: Productos electrónica — ticket alto", "Coordinador llama mentoras: resultados individuales"], tarea_socia: "Ofrecer al menos 1 producto de categoría nueva a clienta existente", rol_coordinador: "1:1 mentoras, dar seguimiento", rol_desarrolladora: "Enviar contenido diario, apoyo con pedidos y CrediPrice", rol_mentora: "Celebrar avances, activar mini dinámicas en grupo" },
  { dia_numero: 10, semana: 2, dia_semana: "miercoles", titulo: "Prospección + Cápsula digital", descripcion: "Cápsula grabada y prospección obligatoria", actividades: ["Cápsula grabada: Cómo publicar y prospectar", "Prospección obligatoria: foto perfil cliente + 2 publicaciones", "Desarrolladoras: llamar socias <60%"], tarea_socia: "5 contactos nuevos + 1 venta a persona que NO sea familiar directo", rol_coordinador: "Coordinador atiende socias >60%", rol_desarrolladora: "Llamar socias <60%. ¿Publican? ¿Prospectan? ¿Usan herramientas?", rol_mentora: "Reportar socias que no responden" },
  { dia_numero: 11, semana: 2, dia_semana: "jueves", titulo: "Taller presencial UM: Ventas", descripcion: "Taller de ventas y cierre", actividades: ["Taller presencial: cómo cerrar, manejar objeciones, presentar outfit completo", "Roleplay de venta entre socias", "Clase complementaria: Accesorios + Casio/Relojes"], tarea_socia: "Aplicar una técnica nueva de cierre aprendida en el taller", rol_coordinador: "Talleres en tiendas", rol_desarrolladora: "Apoyo logístico", rol_mentora: "Compartir tips de cierre reales" },
  { dia_numero: 12, semana: 2, dia_semana: "viernes", titulo: "Mentoría: De socia a empresaria", descripcion: "Entender necesidades del cliente", actividades: ["Mentoría: necesidades del cliente. Cómo entender qué quiere tu clienta", "Mentora comparte: cómo lee a sus clientas, qué preguntas hace"], tarea_socia: "Hacer 3 preguntas a tu próxima clienta antes de mostrar producto", rol_coordinador: "Reporte S2 a Gerente", rol_desarrolladora: "Contenido diario", rol_mentora: "Sesión: cómo leer clientas" },
  { dia_numero: 13, semana: 2, dia_semana: "sabado_domingo", titulo: "Venta fuerte", descripcion: "Fin de semana de venta agresiva", actividades: ["Ejecución de venta fuerte", "Activar ventas relámpago por cluster si el reto va abajo"], tarea_socia: "1 publicación en WhatsApp/cualquier plataforma", rol_coordinador: "Monitorear ventas relámpago", rol_desarrolladora: "Contenido de apoyo", rol_mentora: "Motivar y celebrar" },

  // SEMANA 3 — ESCALAR
  { dia_numero: 15, semana: 3, dia_semana: "lunes", titulo: "Ventas para tu negocio + Resultados S2", descripcion: "Técnicas avanzadas y resultados", actividades: ["Clase: técnicas avanzadas de cierre, venta cruzada, subir ticket", "Cápsula: Familia empresarias — historias inspiradoras", "Resultados S2: ajuste de metas. Incentivos especiales por cluster"], tarea_socia: "Calcular ganancia real de S1-S2 usando método 3C. ¿Cuánto gané?", rol_coordinador: "Resultados S2, planes agresivos", rol_desarrolladora: "Llamar socias rezagadas", rol_mentora: "Compartir historia inspiradora" },
  { dia_numero: 16, semana: 3, dia_semana: "martes", titulo: "TikTok + Prospección digital avanzada", descripcion: "Tutorial TikTok y prospección", actividades: ["Tutorial: crear cuenta y subir primer video en TikTok", "Cápsula: prospectar digital y campo (refuerzo)", "1:1 con mentoras. Foco en socias que hicieron quiebre"], tarea_socia: "Subir primer video/foto en TikTok o Reels mostrando producto", rol_coordinador: "1:1 con mentoras, foco en quiebres", rol_desarrolladora: "Tutorial TikTok, contenido", rol_mentora: "Apoyar con contenido digital" },
  { dia_numero: 17, semana: 3, dia_semana: "miercoles", titulo: "Prospección agresiva", descripcion: "Prospección obligatoria y escalamiento", actividades: ["Prospección obligatoria: foto perfil + 2 publicaciones", "Inactivas >7d: escalar a call center", "Socias con compra consistente: activar upselling"], tarea_socia: "Pedir referidos a 3 clientas satisfechas", rol_coordinador: "Escalar inactivas, activar upselling", rol_desarrolladora: "Contenido y seguimiento", rol_mentora: "Pedir referidos a sus clientas" },
  { dia_numero: 18, semana: 3, dia_semana: "jueves", titulo: "Taller presencial UM: TikTok", descripcion: "Taller TikTok presencial", actividades: ["Taller y cápsula TikTok presencial en UM", "Clase digital: Perfumes — margen alto y fácil venta cruzada"], tarea_socia: "Publicar en FB Marketplace al menos 3 productos con foto real y precio", rol_coordinador: "Talleres en tiendas", rol_desarrolladora: "Apoyo logístico", rol_mentora: "Apoyar publicaciones" },
  { dia_numero: 19, semana: 3, dia_semana: "viernes", titulo: "Mentoría: Ventas FB y Marketplace", descripcion: "Ventas por Facebook y Marketplace", actividades: ["Mentoría: ventas por FB y Marketplace", "Pedir referidos a mentoras para próximo reto"], tarea_socia: "Cerrar al menos 2 ventas este fin de semana con técnica nueva", rol_coordinador: "Reporte S3", rol_desarrolladora: "Contenido diario", rol_mentora: "Sesión ventas FB/Marketplace" },
  { dia_numero: 20, semana: 3, dia_semana: "sabado_domingo", titulo: "Sprint de venta", descripcion: "Ventas relámpago y cupón digital", actividades: ["Sprint de venta. Dinámicas relámpago miércoles a domingo", "Cupón digital semanal: práctica de compra en línea"], tarea_socia: "1 publicación en cualquier plataforma", rol_coordinador: "Monitorear sprint", rol_desarrolladora: "Contenido", rol_mentora: "Motivar sprint" },

  // SEMANA 4 — SOSTENER
  { dia_numero: 22, semana: 4, dia_semana: "lunes", titulo: "El poder de la imagen + Resultados S3", descripcion: "Imagen personal y resultados", actividades: ["Clase: cómo tu imagen personal afecta tus ventas", "Resultados S3: identificar top 10 para evento final", "Foco en recurrencia: ¿tus clientas te van a recomprar?"], tarea_socia: "Contactar TODAS las clientas que ya compraron. Preguntar: ¿Necesitas algo más?", rol_coordinador: "Resultados S3, identificar finalistas", rol_desarrolladora: "Llamar rezagadas", rol_mentora: "Foco en recurrencia" },
  { dia_numero: 23, semana: 4, dia_semana: "martes", titulo: "Clase producto + Sprint de cierre", descripcion: "Lencería y sprint final", actividades: ["Clase: Producto lencería — categoría de recompra frecuente", "Sprint urgencia: socias 60-90% atención especial", "Socias <30%: evaluar como probable G3"], tarea_socia: "Revisar cartera de clientas. ¿Cuántas tienes? ¿Cuántas recompran?", rol_coordinador: "Sprint urgencia socias 60-90%", rol_desarrolladora: "Seguimiento a socias pendientes", rol_mentora: "Empujar cierre" },
  { dia_numero: 24, semana: 4, dia_semana: "miercoles", titulo: "Prospección + Últimas ventas", descripcion: "Últimos días de prospección", actividades: ["Prospección obligatoria hasta el último día", "Notificaciones de posibles finalistas. Crear urgencia sana", "Buscar historias inspiradoras para evento final"], tarea_socia: "Calcular ganancia real del mes completo", rol_coordinador: "Crear urgencia sana, historias", rol_desarrolladora: "Contenido final", rol_mentora: "Motivar último sprint" },
  { dia_numero: 25, semana: 4, dia_semana: "jueves", titulo: "Taller presencial UM: Imagen", descripcion: "Taller de imagen personal", actividades: ["Taller Imagen presencial UM", "Imagen personal de la socia como emprendedora", "Preparar diplomas, cartas personalizadas, premios"], tarea_socia: "Escribir: ¿Qué aprendí? ¿Qué voy a seguir haciendo?", rol_coordinador: "Preparar evento final", rol_desarrolladora: "Preparar diplomas y materiales", rol_mentora: "Sesión de reflexión con socias" },
  { dia_numero: 26, semana: 4, dia_semana: "viernes", titulo: "Mentoría: Fidelización del cliente", descripcion: "Mentoría final sobre retención", actividades: ["Mentoría final: fidelización del cliente post-reto", "Mentora comparte: cómo mantiene clientas año tras año"], tarea_socia: "Crear lista de tus 10 mejores clientas. Esas son tu negocio post-reto.", rol_coordinador: "Reporte final", rol_desarrolladora: "Contenido de cierre", rol_mentora: "Sesión final fidelización" },
  { dia_numero: 27, semana: 4, dia_semana: "sabado_domingo", titulo: "Sprint final", descripcion: "Último sprint de ventas", actividades: ["Sprint final de ventas", "Mantener enroladas a todas, que ninguna se desanime", "Solución de dudas del rush final"], tarea_socia: "¡Sal de tu zona de confort y a cerrar con todo!", rol_coordinador: "Monitorear cierre", rol_desarrolladora: "Soporte final", rol_mentora: "Motivar cierre" },
  { dia_numero: 29, semana: 4, dia_semana: "lunes", titulo: "Cierre del reto", descripcion: "Último día del reto", actividades: ["Día extra de cierre", "Últimas compras", "Preparar resultados finales y evento de premiación"], tarea_socia: "Último día. Cierra tus últimas ventas.", rol_coordinador: "Cerrar resultados", rol_desarrolladora: "Compilar datos finales", rol_mentora: "Mensaje de cierre y agradecimiento" },
];
