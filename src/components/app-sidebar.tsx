import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Stethoscope,
  ShieldCheck,
  Building2,
  ClipboardList,
  Clock,
  FileBarChart2,
  Settings,
  BookOpenCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";

const baseItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Preceptores", url: "/preceptores", icon: Stethoscope },
  { title: "Alunos", url: "/alunos", icon: GraduationCap },
  { title: "Hospitais / Locais", url: "/hospitais", icon: Building2 },
  { title: "Atividades", url: "/atividades", icon: ClipboardList },
  { title: "Carga Horária", url: "/carga-horaria", icon: Clock },
  { title: "Relatórios", url: "/relatorios", icon: FileBarChart2 },
];

const tailItems = [{ title: "Configurações", url: "/configuracoes", icon: Settings }];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { user } = useAuth();
  const items = [
    ...baseItems,
    ...(user?.role === "super_admin"
      ? [{ title: "Usuários", url: "/usuarios", icon: ShieldCheck }]
      : []),
    ...tailItems,
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="pt-2">
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="h-10 rounded-lg data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:font-medium hover:bg-accent/40"
                    >
                      <Link to={item.url} className="flex items-center gap-3 px-3">
                        <item.icon className="h-4.5 w-4.5" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-3 py-3">
        {!collapsed ? (
          <div className="flex items-start gap-2 rounded-lg bg-accent/60 p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <BookOpenCheck className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="text-[12px] font-semibold text-foreground">Painel de Preceptoria</p>
              <p className="text-[11px] text-muted-foreground">Gestão do Internato Afya</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <BookOpenCheck className="h-4 w-4 text-primary" />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
