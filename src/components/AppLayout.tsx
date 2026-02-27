import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";

const rolBadgeStyle: Record<string, string> = {
  director: "bg-yellow-500/10 text-yellow-400",
  gerente: "bg-blue-800/20 text-blue-300",
  coordinador: "bg-blue-500/10 text-blue-400",
  desarrolladora: "bg-emerald-500/10 text-emerald-400",
  mentora: "bg-pink-500/10 text-pink-400",
};

const rolLabel: Record<string, string> = {
  director: "Director",
  gerente: "Gerente",
  coordinador: "Coordinador",
  desarrolladora: "Desarrolladora",
  mentora: "Mentora",
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <span className="text-sm font-medium text-muted-foreground">
                {profile?.nombre}
              </span>
            </div>
            <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${rolBadgeStyle[profile?.rol || ""] || "bg-primary/10 text-primary"}`}>
              {rolLabel[profile?.rol || ""] || profile?.rol}
            </span>
          </header>
          <main className="flex-1 p-6 animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
