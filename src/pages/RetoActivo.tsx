import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RetoWizard } from "@/components/reto/RetoWizard";
import { RetoPanel } from "@/components/reto/RetoPanel";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";

export default function RetoActivo() {
  const { profile } = useAuth();
  const [showWizard, setShowWizard] = useState(false);

  const { data: retoActivo, isLoading, refetch } = useQuery({
    queryKey: ["reto-activo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("retos")
        .select("*")
        .in("estado", ["publicado", "activo"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

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

  if (!retoActivo) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <Rocket className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">No hay reto activo</h1>
        <p className="mb-6 text-muted-foreground">Crea un nuevo reto para comenzar a operar</p>
        {(profile?.rol === "director" || profile?.rol === "gerente") && (
          <Button size="lg" onClick={() => setShowWizard(true)}>
            <Rocket className="mr-2 h-5 w-5" />
            Crear Nuevo Reto
          </Button>
        )}
      </div>
    );
  }

  return <RetoPanel reto={retoActivo} onRefresh={refetch} />;
}
