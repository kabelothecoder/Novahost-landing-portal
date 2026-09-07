import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopNavbar } from "@/components/TopNavbar";
import { useIsMobile } from "@/hooks/use-mobile";

/*
 * The shell is deliberately plain: a sidebar, a header, and a scrolling column.
 *
 * It previously stacked two full-page background layers — a panning radial
 * gradient and the user's avatar blurred to 100px — behind every screen. Both
 * are gone. The avatar layer also cost a `profiles` query on every mount purely
 * for decoration.
 */
export function DashboardLayout() {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />

        <div className="relative flex h-screen min-w-0 flex-1 flex-col overflow-y-auto">
          <TopNavbar />

          <main className="animate-enter flex-1 px-4 py-6 md:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
