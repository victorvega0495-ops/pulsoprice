import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import Setup from "./pages/Setup";
import Placeholder from "./pages/Placeholder";
import Equipo from "./pages/Equipo";
import RetoActivo from "./pages/RetoActivo";
import ColaTrabajo from "./pages/ColaTrabajo";
import PipelineSeguimiento from "./pages/PipelineSeguimiento";
import DashboardOperativo from "./pages/DashboardOperativo";
import DashboardEjecutivo from "./pages/DashboardEjecutivo";
import ReglasMetodo from "./pages/ReglasMetodo";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function DefaultRedirect() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) return <Navigate to="/login" replace />;

  const redirectMap: Record<string, string> = {
    director: "/dashboard",
    gerente: "/dashboard-operativo",
    coordinador: "/cola-trabajo",
    desarrolladora: "/cola-trabajo",
    mentora: "/pendientes",
  };

  return <Navigate to={redirectMap[profile.rol] || "/dashboard"} replace />;
}

function LayoutRoute() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Placeholder />
      </AppLayout>
    </ProtectedRoute>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/" element={<ProtectedRoute><DefaultRedirect /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><AppLayout><DashboardEjecutivo /></AppLayout></ProtectedRoute>} />
            <Route path="/retos" element={<LayoutRoute />} />
            <Route path="/equipo" element={<ProtectedRoute><AppLayout><Equipo /></AppLayout></ProtectedRoute>} />
            <Route path="/dashboard-operativo" element={<ProtectedRoute><AppLayout><DashboardOperativo /></AppLayout></ProtectedRoute>} />
            <Route path="/reto-activo" element={<ProtectedRoute><AppLayout><RetoActivo /></AppLayout></ProtectedRoute>} />
            <Route path="/pipeline" element={<ProtectedRoute><AppLayout><PipelineSeguimiento /></AppLayout></ProtectedRoute>} />
            <Route path="/reglas" element={<ProtectedRoute><AppLayout><ReglasMetodo /></AppLayout></ProtectedRoute>} />
            <Route path="/centro-ia" element={<LayoutRoute />} />
            <Route path="/cola-trabajo" element={<ProtectedRoute><AppLayout><ColaTrabajo /></AppLayout></ProtectedRoute>} />
            <Route path="/mi-reto" element={<LayoutRoute />} />
            <Route path="/mis-mentoras" element={<LayoutRoute />} />
            <Route path="/contenido" element={<LayoutRoute />} />
            <Route path="/pendientes" element={<LayoutRoute />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
