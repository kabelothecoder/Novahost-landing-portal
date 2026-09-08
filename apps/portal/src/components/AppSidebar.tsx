import {
  BarChart3,
  Bot,
  BookOpen,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  MessageSquare,
  RotateCcw,
  SlidersHorizontal,
  Zap,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { cn } from "@/lib/utils";

import {
  Sidebar,
  SidebarContent,
  useSidebar,
} from "@/components/ui/sidebar";

/*
 * Navigation is grouped rather than flat. The previous sidebar exposed five
 * routes; the portal has fourteen, so Key Stats, Reactivate, the hosting guide,
 * the web builder and feedback were reachable only by typing a URL.
 *
 * Profile and Settings stay in the account menu, where people look for them.
 */
const navGroups: Array<{
  label: string;
  items: Array<{ title: string; url: string; icon: typeof LayoutDashboard }>;
}> = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", url: "/", icon: LayoutDashboard }],
  },
  {
    label: "Licensing",
    items: [
      { title: "Generate Key", url: "/generate", icon: KeyRound },
      { title: "Licenses", url: "/dispatcher/licenses", icon: Shield },
      { title: "Reactivate", url: "/reactivate", icon: RotateCcw },
      { title: "Key Stats", url: "/stats", icon: BarChart3 },
    ],
  },
  {
    label: "Trading",
    items: [
      { title: "Quick Trade", url: "/dispatcher/quick-trade", icon: Zap },
      { title: "Normal Trade", url: "/dispatcher/normal-trade", icon: SlidersHorizontal },
      { title: "Expert Advisors", url: "/manage", icon: Bot },
    ],
  },
  {
    label: "Resources",
    items: [
      { title: "Hosting Guide", url: "/tutorial", icon: BookOpen },
      { title: "Web Builder", url: "/builder", icon: LayoutTemplate },
      { title: "Feedback", url: "/feedback", icon: MessageSquare },
    ],
  },
];

// Shown only to accounts in `admin_users` (see useIsAdmin). The page and its
// edge function both re-check server-side, so this is UI tidiness, not a gate.
const adminGroup = {
  label: "Admin",
  items: [{ title: "Comp Access", url: "/admin/access", icon: ShieldCheck }],
};

export function AppSidebar() {
  const { state } = useSidebar();
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const isCollapsed = state === "collapsed" && !isMobile;
  const { isAdmin } = useIsAdmin();

  const groups = isAdmin ? [...navGroups, adminGroup] : navGroups;

  // The dashboard is the only route that must match exactly; every other entry
  // should stay lit while you are on one of its detail pages.
  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname.startsWith(url);

  return (
    <Sidebar
      className="border-r border-sidebar-border bg-sidebar/70 backdrop-blur-xl"
      collapsible={isMobile ? "offcanvas" : "icon"}
      variant={isMobile ? "floating" : "sidebar"}
    >
      <SidebarContent className="gap-0">
        {/* Brand — sized to match the header opposite it so the hairlines line up */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-sidebar-border",
            isCollapsed ? "justify-center px-2" : "px-4",
          )}
        >
          <div className="flex items-center gap-2.5">
            <img
              src="/novahost-mark.png"
              alt=""
              aria-hidden="true"
              className="h-7 w-7 shrink-0 rounded-md object-cover"
            />
            {!isCollapsed && (
              <span className="text-sm font-semibold text-sidebar-accent-foreground">
                NovaHost
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {groups.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              {!isCollapsed && (
                <p className="section-label px-2 pb-1.5">{group.label}</p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <li key={item.url}>
                      <NavLink
                        to={item.url}
                        title={isCollapsed ? item.title : undefined}
                        className={cn(
                          "flex h-8 items-center gap-2.5 rounded-md text-sm transition-colors",
                          isCollapsed ? "justify-center px-0" : "px-2",
                          active
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                        {!isCollapsed && <span className="truncate">{item.title}</span>}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </SidebarContent>
    </Sidebar>
  );
}
