import {
  LayoutDashboard, Trophy, Users, Zap, GitBranch, BookOpen, Bot,
  ListTodo, Phone, ClipboardList, Activity, LogOut
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

interface NavItem {
  title: string;
  url: string;
  icon: any;
}

function getNavItems(rol: string, modoOperativo: string[]): NavItem[] {
  switch (rol) {
    case "director":
      return [
        { title: "Dashboard Ejecutivo", url: "/dashboard", icon: LayoutDashboard },
        { title: "Retos", url: "/retos", icon: Trophy },
        { title: "Equipo", url: "/equipo", icon: Users },
      ];
    case "gerente":
      return [
        { title: "Dashboard Operativo", url: "/dashboard-operativo", icon: LayoutDashboard },
        { title: "Reto Activo", url: "/reto-activo", icon: Zap },
        { title: "Pipeline Seguimiento", url: "/pipeline", icon: GitBranch },
        { title: "Reglas del Método", url: "/reglas", icon: BookOpen },
        { title: "Centro de IA", url: "/centro-ia", icon: Bot },
        { title: "Equipo", url: "/equipo", icon: Users },
      ];
    case "operador": {
      const items: NavItem[] = [
        { title: "Cola de Trabajo", url: "/cola-trabajo", icon: ListTodo },
      ];
      const hasOperacion = modoOperativo.includes("operacion");
      const hasSeguimiento = modoOperativo.includes("seguimiento");
      if (hasOperacion) items.push({ title: "Mi Reto", url: "/mi-reto", icon: Trophy });
      if (hasSeguimiento) items.push({ title: "Mi Pipeline", url: "/mi-pipeline", icon: GitBranch });
      return items;
    }
    case "call_center":
      return [
        { title: "Mi Lista de Llamadas", url: "/llamadas", icon: Phone },
      ];
    case "mentora":
      return [
        { title: "Mis Pendientes", url: "/pendientes", icon: ClipboardList },
      ];
    default:
      return [];
  }
}

export function AppSidebar() {
  const { profile, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  if (!profile) return null;

  const navItems = getNavItems(profile.rol, profile.modo_operativo);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {!collapsed && <span className="font-bold tracking-tight">Pulso</span>}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {!collapsed && (
          <div className="px-3 pb-2">
            <p className="truncate text-sm font-medium text-foreground">{profile.nombre}</p>
            <p className="truncate text-xs text-muted-foreground capitalize">{profile.rol.replace("_", " ")}</p>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Cerrar sesión</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
