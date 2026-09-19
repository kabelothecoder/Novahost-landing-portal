import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Banknote,
  CreditCard,
  FileSignature,
  Gift,
  Globe,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Moon,
  PackagePlus,
  Percent,
  Radio,
  Sun,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Only the dashboard matches exactly; every other row stays lit on its
   *  detail pages. */
  end?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Grouped so the sidebar reads as four jobs rather than twelve links: watch the
 * money, grow the network, look after the people, keep the machine running.
 */
const NAV: NavGroup[] = [
  {
    label: "Business",
    items: [
      { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/revenue", label: "Revenue", icon: Banknote },
      { to: "/payments", label: "Payments & refunds", icon: CreditCard },
    ],
  },
  {
    label: "Affiliate",
    items: [
      { to: "/affiliate", label: "Performance", icon: Percent },
      { to: "/agreements", label: "Agreements & payouts", icon: FileSignature },
      { to: "/websites", label: "Website requests", icon: Globe },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/subscriptions", label: "Subscriptions", icon: BadgeCheck },
      { to: "/approvals", label: "Mentor approvals", icon: UserCheck },
      { to: "/key-requests", label: "Key requests", icon: PackagePlus },
      { to: "/comp-access", label: "Comp access", icon: Gift },
      { to: "/directory", label: "Directory", icon: Users },
      { to: "/broadcast", label: "Broadcast", icon: Mail },
    ],
  },
  {
    label: "Platform",
    items: [
      { to: "/licences", label: "Licences & devices", icon: KeyRound },
      { to: "/signals", label: "Signal pipeline", icon: Radio },
    ],
  },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {NAV.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end ?? false}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors",
                      isActive
                        ? "bg-primary-muted text-primary dark:bg-primary/15"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * The frame every admin page renders inside.
 *
 * Deliberately the portal's neutral dual-theme system, not the marketing
 * gradient: this is a console for reading numbers, and a saturated ground makes
 * a red figure harder to tell from a green one.
 */
export function AdminShell() {
  const { user, signOut } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  const title =
    NAV.flatMap((g) => g.items).find((i) =>
      i.to === "/" ? pathname === "/" : pathname.startsWith(i.to),
    )?.label ?? "Admin";

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar-background lg:flex">
        <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-4">
          <img
            src="/novahost-mark.png"
            alt=""
            width={26}
            height={26}
            className="rounded-[22%] object-cover"
          />
          <div className="leading-tight">
            <p className="text-[14px] font-semibold">NovaHost</p>
            <p className="text-[11px] text-muted-foreground">Admin</p>
          </div>
        </div>
        <SidebarBody />
        <div className="border-t border-sidebar-border p-3">
          <p className="truncate px-2 pb-2 text-[11.5px] text-muted-foreground" title={user?.email ?? ""}>
            {user?.email}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-[13px]"
            onClick={() => void signOut()}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* ── Sidebar (mobile sheet) ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[268px] flex-col border-r border-sidebar-border bg-sidebar-background">
            <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-4">
              <span className="text-[14px] font-semibold">NovaHost Admin</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SidebarBody onNavigate={() => setMobileOpen(false)} />
            <div className="border-t border-sidebar-border p-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => void signOut()}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <h1 className="text-[15px] font-semibold">{title}</h1>
          </div>
          <ThemeToggle />
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
