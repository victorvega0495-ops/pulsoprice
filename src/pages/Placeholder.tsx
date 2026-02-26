import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";

const routeNames: Record<string, string> = {
  "/dashboard": "Dashboard Ejecutivo",
  "/retos": "Retos",
  "/equipo": "Equipo",
  "/dashboard-operativo": "Dashboard Operativo",
  "/reto-activo": "Reto Activo",
  "/pipeline": "Pipeline Seguimiento",
  "/reglas": "Reglas del Método",
  "/centro-ia": "Centro de IA",
  "/cola-trabajo": "Cola de Trabajo",
  "/mi-reto": "Mi Reto",
  "/mi-pipeline": "Mi Pipeline",
  "/llamadas": "Mi Lista de Llamadas",
  "/pendientes": "Mis Pendientes",
};

export default function Placeholder() {
  const location = useLocation();
  const title = routeNames[location.pathname] || "Página";

  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Construction className="h-8 w-8 text-primary" />
      </div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">Esta sección está en construcción</p>
    </div>
  );
}
