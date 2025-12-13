import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Loader } from "lucide-react";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { DashboardProvider } from "./lib/DashboardContext";
import { AuthProvider } from './lib/AuthProvider'
import { AdminProvider } from './lib/AdminContext'
import { SessionTracker } from './components/SessionTracker'
import AuthGuard from './components/AuthGuard'
import FeatureGuard from './components/FeatureGuard'
import LockedFeaturePage from './components/LockedFeaturePage'
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import { AuthCallback } from "./pages/auth/callback";
import PropFirmDashboard from "./pages/dashboard/PropFirmDashboard";
import JournalDashboard from "./pages/dashboard/JournalDashboard";
import Accounts from "./pages/dashboard/Accounts";
import TradeCopier from "./pages/dashboard/TradeCopier";
import TradingJournal from "./pages/dashboard/TradingJournal";
import Performance from "./pages/dashboard/Performance";
import Payouts from "./pages/dashboard/Payouts";
import Settings from "./pages/dashboard/Settings";
import Admin from "./pages/Admin";
import UnderMaintenance from "./pages/UnderMaintenance";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Global Auth Loader - Intercepts all auth-related URLs before routing
function AuthLoadingInterceptor({ children }: { children: React.ReactNode }) {
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Only check ONCE on initial mount, not on every navigation
    if (hasChecked) return;
    
    // Check if URL contains auth-related parameters
    const checkAuthParams = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      const fullUrl = hash + search;

      // Only check for ACTUAL auth tokens (not just route names)
      // This prevents false positives when navigating to /verify or /confirm routes
      const hasActualAuthTokens = 
        fullUrl.includes('access_token=') ||
        fullUrl.includes('refresh_token=') ||
        fullUrl.includes('token_type=') ||
        fullUrl.includes('type=recovery') ||
        fullUrl.includes('type=signup') ||
        fullUrl.includes('type=invite') ||
        fullUrl.includes('type=magiclink') ||
        fullUrl.includes('type=email_change') ||
        search.includes('token=') ||
        search.includes('code=');

      if (hasActualAuthTokens) {
        setIsAuthLoading(true);
        
        // Redirect to auth callback after a brief moment
        setTimeout(() => {
          window.location.hash = '#/auth/callback';
          setTimeout(() => setIsAuthLoading(false), 500);
        }, 100);
      }
      
      setHasChecked(true);
    };

    checkAuthParams();
  }, [hasChecked]);

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md">
          <Loader className="w-16 h-16 animate-spin text-cyan-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Verifying Email...</h2>
          <p className="text-gray-600">Please wait while we confirm your account</p>
          <p className="text-sm text-gray-500 mt-2">This will only take a moment</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <AuthProvider>
      <SessionTracker>
      <AdminProvider>
      <Toaster />
      <Sonner />
      <AuthLoadingInterceptor>
      <Router>
      <DashboardProvider>
        <Routes>
          {/* Maintenance Page */}
          <Route path="/maintenance" element={<UnderMaintenance />} />

          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/pricing" element={<Pricing />} />

          {/* OAuth Callback */}
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AuthGuard><Admin /></AuthGuard>} />

          {/* Dashboard Routes */}
          <Route path="/dashboard" element={<AuthGuard><DashboardLayout><JournalDashboard /></DashboardLayout></AuthGuard>} />
          <Route path="/dashboard/propfirm" element={<AuthGuard><FeatureGuard feature="propfirm"><DashboardLayout><PropFirmDashboard /></DashboardLayout></FeatureGuard></AuthGuard>} />
          <Route path="/dashboard/accounts" element={<AuthGuard><DashboardLayout><Accounts /></DashboardLayout></AuthGuard>} />
          <Route path="/dashboard/copier" element={<AuthGuard><DashboardLayout><TradeCopier /></DashboardLayout></AuthGuard>} />
          <Route path="/dashboard/journal" element={<AuthGuard><DashboardLayout><TradingJournal /></DashboardLayout></AuthGuard>} />
          <Route path="/dashboard/performance" element={<AuthGuard><DashboardLayout><Performance /></DashboardLayout></AuthGuard>} />
          <Route path="/dashboard/payouts" element={<AuthGuard><DashboardLayout><Payouts /></DashboardLayout></AuthGuard>} />
          <Route path="/dashboard/settings" element={<AuthGuard><DashboardLayout><Settings /></DashboardLayout></AuthGuard>} />

          {/* Email verification routes */}
          <Route path="/verify" element={<AuthCallback />} />
          <Route path="/confirm" element={<AuthCallback />} />

          {/* Catch-all - Must be last */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </DashboardProvider>
      </Router>
      </AuthLoadingInterceptor>
      </AdminProvider>
      </SessionTracker>
  </AuthProvider>
  </TooltipProvider>
  </QueryClientProvider>
);

export default App;