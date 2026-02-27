import {
  LayoutDashboard, Trophy, Users, GitBranch, BookOpen, Bot,
  ListTodo, Activity, LogOut, UserCheck, FileText
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

interface NavItem {
  title: string;
  url: string;
  icon: any;
}

function getNavItems(rol: string): NavItem[] {
  switch (rol) {
    case "director":
      return [
        { title: "Dashboard Ejecutivo", url: "/dashboard", icon: LayoutDashboard },
        { title: "Reto Activo", url: "/reto-activo", icon: Trophy },
        { title: "Pipeline", url: "/pipeline", icon: GitBranch },
        { title: "Equipo", url: "/equipo", icon: Users },
        { title: "Centro IA", url: "/centro-ia", icon: Bot },
      ];
    case "gerente":
      return [
        { title: "Dashboard Operativo", url: "/dashboard-operativo", icon: LayoutDashboard },
        { title: "Reto Activo", url: "/reto-activo", icon: Trophy },
        { title: "Cola de Trabajo", url: "/cola-trabajo", icon: ListTodo },
        { title: "Pipeline", url: "/pipeline", icon: GitBranch },
        { title: "Reglas del Método", url: "/reglas", icon: BookOpen },
        { title: "Equipo", url: "/equipo", icon: Users },
        { title: "Gestión de Retos", url: "/retos", icon: Trophy },
        { title: "Centro IA", url: "/centro-ia", icon: Bot },
      ];
    case "coordinador":
      return [
        { title: "Cola de Trabajo", url: "/cola-trabajo", icon: ListTodo },
        { title: "Mi Reto", url: "/mi-reto", icon: Trophy },
        { title: "Mis Mentoras", url: "/mis-mentoras", icon: UserCheck },
      ];
    case "desarrolladora":
      return [
        { title: "Cola de Trabajo", url: "/cola-trabajo", icon: ListTodo },
        { title: "Mi Reto", url: "/mi-reto", icon: Trophy },
        { title: "Contenido", url: "/contenido", icon: FileText },
      ];
    case "mentora":
      return [
        { title: "Mis Pendientes", url: "/pendientes", icon: ListTodo },
      ];
    default:
      return [];
  }
}

const rolLabel: Record<string, string> = {
  director: "Director",
  gerente: "Gerente",
  coordinador: "Coordinador",
  desarrolladora: "Desarrolladora",
  mentora: "Mentora",
};

export function AppSidebar() {
  const { profile, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  if (!profile) return null;

  const navItems = getNavItems(profile.rol);

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
            <p className="truncate text-xs text-muted-foreground">{rolLabel[profile.rol] || profile.rol}</p>
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
