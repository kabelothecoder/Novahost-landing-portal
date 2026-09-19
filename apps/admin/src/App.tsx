import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";
import { AdminShell } from "@/components/AdminShell";
import { MfaGate } from "@/components/MfaGate";
import Login from "@/pages/Login";
import Overview from "@/pages/Overview";
import Revenue from "@/pages/Revenue";
import Payments from "@/pages/Payments";
import Subscriptions from "@/pages/Subscriptions";
import Approvals from "@/pages/Approvals";
import KeyRequests from "@/pages/KeyRequests";
import Broadcast from "@/pages/Broadcast";
import CompAccess from "@/pages/CompAccess";
import Directory from "@/pages/Directory";
import Licences from "@/pages/Licences";
import Signals from "@/pages/Signals";
import Affiliate from "@/pages/Affiliate";
import Agreements from "@/pages/Agreements";
import Websites from "@/pages/Websites";

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

/**
 * The whole console behind one gate.
 *
 * `isAdmin === null` means we have not finished asking, and rendering the login
 * screen in that gap would flash it at an admin on every refresh — so hold the
 * spinner until the answer is a real boolean.
 *
 * The gate itself is cosmetic. Every page's data comes from an edge function
 * that re-checks `admin_users` AND requires an aal2 session on the service
 * role, so deleting this component in devtools buys a determined visitor a set
 * of empty tables and a row of 403s.
 *
 * Order matters: admin check, then two-factor. A mentor who signs in here must
 * meet the "not an admin" screen rather than be invited to enrol an
 * authenticator against a console they can never open.
 */
function Gate() {
  const { user, loading, isAdmin, adminLoading } = useAdminAuth();

  if (loading) return <Spinner />;
  if (!user) return <Login />;
  if (adminLoading || isAdmin === null) return <Spinner />;
  if (!isAdmin) return <Login />;

  return (
    <MfaGate>
      <Routes>
        <Route element={<AdminShell />}>
          <Route path="/" element={<Overview />} />
          <Route path="/revenue" element={<Revenue />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/key-requests" element={<KeyRequests />} />
          <Route path="/broadcast" element={<Broadcast />} />
          <Route path="/affiliate" element={<Affiliate />} />
          <Route path="/agreements" element={<Agreements />} />
          <Route path="/websites" element={<Websites />} />
          <Route path="/comp-access" element={<CompAccess />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/licences" element={<Licences />} />
          <Route path="/signals" element={<Signals />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </MfaGate>
  );
}

export default function App() {
  return (
    // Dark by default: this is a console someone reads numbers off, often beside
    // a trading terminal. The toggle is in the header for anyone who disagrees.
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <AdminAuthProvider>
          <BrowserRouter>
            <Gate />
          </BrowserRouter>
          <Toaster />
        </AdminAuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
