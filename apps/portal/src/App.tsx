import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import Index from "@/pages/Index";
import GenerateKey from "@/pages/GenerateKey";
import LicenseDetails from "@/pages/LicenseDetails";
import ManageEAs from "@/pages/ManageEAs";
import ReActivateKey from "@/pages/ReActivateKey";
import KeyStats from "@/pages/KeyStats";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import QuickTrade from "@/pages/QuickTrade";
import NormalTrade from "@/pages/NormalTrade";
import HostingTutorial from "@/pages/HostingTutorial";
import WebBuilder from "@/pages/WebBuilder";
import Feedback from "@/pages/Feedback";
import ManageEA from "@/pages/ManageEA";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import UpdatePassword from "@/pages/UpdatePassword";
import NotFound from "@/pages/NotFound";
import Landing from "@/pages/Landing";
import LicenseManagement from "@/pages/LicenseManagement";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Refunds from "@/pages/Refunds";
import Contact from "@/pages/Contact";
import AdminAccess from "@/pages/AdminAccess";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    // A visitor arriving at the root should meet the landing page, not a login
    // wall. Deeper pages still bounce to /login, since there is nothing to
    // market there and the destination is meaningless when signed out.
    if (location.pathname === "/") {
      return <Landing />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public route wrapper (redirects to dashboard if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/landing" element={<Landing />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/refunds" element={<Refunds />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />
      <Route path="/update-password" element={
        <UpdatePassword />
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Index />} />
        <Route path="generate" element={<GenerateKey />} />
        <Route path="license-details/:licenseId" element={<LicenseDetails />} />
        <Route path="manage" element={<ManageEAs />} />
        <Route path="dispatcher/quick-trade" element={<QuickTrade />} />
        <Route path="dispatcher/normal-trade" element={<NormalTrade />} />
        <Route path="tutorial" element={<HostingTutorial />} />
        <Route path="reactivate" element={<ReActivateKey />} />
        <Route path="stats" element={<KeyStats />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="builder" element={<WebBuilder />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="dashboard/ea/:id/manage" element={<ManageEA />} />
        <Route path="dispatcher/licenses" element={<LicenseManagement />} />
        <Route path="admin/access" element={<AdminAccess />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Router>
              <AppRoutes />
            </Router>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
