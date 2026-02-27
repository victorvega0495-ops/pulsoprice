import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const estadoBadge: Record<string, { label: string; className: string }> = {
  borrador: { label: "Borrador", className: "bg-muted text-muted-foreground" },
  publicado: { label: "Publicado", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  activo: { label: "Activo", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  en_cierre: { label: "En cierre", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  cerrado: { label: "Cerrado", className: "bg-zinc-700/50 text-zinc-300 border-zinc-600/30" },
  cancelado: { label: "Cancelado", className: "bg-destructive/20 text-destructive border-destructive/30" },
};

export default function GestionRetos() {
  const navigate = useNavigate();

  const { data: retos = [], isLoading } = useQuery({
    queryKey: ["todos-retos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("retos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: sociasCounts = {} } = useQuery({
    queryKey: ["socias-count-by-reto"],
    queryFn: async () => {
      const { data } = await supabase
        .from("socias_reto")
        .select("reto_id");
      if (!data) return {};
      const counts: Record<string, number> = {};
      data.forEach((s) => {
        counts[s.reto_id] = (counts[s.reto_id] || 0) + 1;
      });
      return counts;
    },
  });

  const hayActivo = retos.some((r) => r.estado === "activo");

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
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Reto
        </Button>
      </div>

      {hayActivo && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Ya hay un reto en estado "activo". Solo puede haber uno a la vez.
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Fechas</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right"># Socias</TableHead>
              <TableHead className="text-right">Meta Estándar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {retos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  No hay retos creados aún
                </TableCell>
              </TableRow>
            ) : (
              retos.map((r) => {
                const badge = estadoBadge[r.estado] || estadoBadge.borrador;
                return (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => navigate("/reto-activo")}
                  >
                    <TableCell className="font-medium">{r.nombre}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(r.fecha_inicio), "d MMM", { locale: es })} — {format(new Date(r.fecha_fin), "d MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{(sociasCounts[r.id] || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">${Number(r.meta_estandar).toLocaleString()}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
