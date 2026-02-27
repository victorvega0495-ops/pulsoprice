import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RetoWizard } from "@/components/reto/RetoWizard";
import { RetoPanel } from "@/components/reto/RetoPanel";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Rocket } from "lucide-react";

export default function RetoActivo() {
  const { profile } = useAuth();
  const [showWizard, setShowWizard] = useState(false);
  const [selectedRetoId, setSelectedRetoId] = useState<string>("auto");

  const { data: retosDisponibles = [], isLoading, refetch } = useQuery({
    queryKey: ["retos-disponibles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("retos")
        .select("*")
        .in("estado", ["publicado", "activo", "en_cierre"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const retoActivo = selectedRetoId === "auto"
    ? (retosDisponibles.find((r: any) => r.estado === "activo") || retosDisponibles[0] || null)
    : retosDisponibles.find((r: any) => r.id === selectedRetoId) || null;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (showWizard) {
    return <RetoWizard onClose={() => setShowWizard(false)} onPublished={() => { setShowWizard(false); refetch(); }} />;
  }

  if (retosDisponibles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <Rocket className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">No hay reto activo</h1>
        <p className="mb-6 text-muted-foreground">Crea un nuevo reto para comenzar a operar</p>
        {(profile?.rol === "director" || profile?.rol === "gerente") && (
          <Button size="lg" onClick={() => setShowWizard(true)}>
            <Rocket className="mr-2 h-5 w-5" /> Crear Nuevo Reto
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {retosDisponibles.length > 1 && (
        <Select value={selectedRetoId} onValueChange={setSelectedRetoId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Seleccionar reto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Reto activo más reciente</SelectItem>
            {retosDisponibles.map((r: any) => (
              <SelectItem key={r.id} value={r.id}>
                {r.nombre} ({r.estado})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {retoActivo && <RetoPanel reto={retoActivo} onRefresh={refetch} />}
    </div>
  );
}
