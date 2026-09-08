import { ChevronDown, Moon, Plus, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";

/*
 * Longest prefix wins, so `/dispatcher/quick-trade` resolves before
 * `/dispatcher`. The header used to read "Dashboard — Welcome back, Admin" on
 * every route, including the ones that were neither.
 */
const PAGE_TITLES: Array<[string, string]> = [
  ["/dispatcher/quick-trade", "Quick Trade"],
  ["/dispatcher/normal-trade", "Normal Trade"],
  ["/dispatcher/licenses", "Licenses"],
  ["/license-details", "License Details"],
  ["/dashboard/ea", "Expert Advisor"],
  ["/generate", "Generate Key"],
  ["/reactivate", "Reactivate Key"],
  ["/stats", "Key Stats"],
  ["/manage", "Expert Advisors"],
  ["/tutorial", "Hosting Guide"],
  ["/builder", "Web Builder"],
  ["/feedback", "Feedback"],
  ["/profile", "Profile"],
  ["/settings", "Settings"],
];

function usePageTitle() {
  const { pathname } = useLocation();
  if (pathname === "/") return "Dashboard";
  return PAGE_TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "Dashboard";
}

export function TopNavbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const title = usePageTitle();

  const displayName =
    user?.user_metadata?.displayName || user?.email?.split("@")[0] || "Account";

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Sticky, and content scrolls under it — which is what gives the blur
  // something to act on.
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/70 px-4 backdrop-blur-xl md:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="-ml-1 shrink-0 text-muted-foreground" />
        <h1 className="truncate text-sm font-semibold">{title}</h1>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => navigate("/generate")}>
              License key
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/manage")}>
              Expert Advisor
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/dispatcher/quick-trade")}>
              Trade signal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/*
          A single toggle rather than the sun/switch/moon triple. `resolvedTheme`
          is what is actually on screen, so this works from the "system" default
          too — the old check compared against `theme`, which is literally
          "system" on first load and never matched.
        */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label={resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-[11px]">
                  {user?.email?.charAt(0).toUpperCase() || <User className="h-3 w-3" />}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[10rem] truncate text-sm font-normal lg:block">
                {displayName}
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
