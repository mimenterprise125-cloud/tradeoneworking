import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <AuthProvider>
      <SessionTracker>
      <AdminProvider>
      <Toaster />
      <Sonner />
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

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </DashboardProvider>
      </Router>
      </AdminProvider>
      </SessionTracker>
  </AuthProvider>
  </TooltipProvider>
  </QueryClientProvider>
);

export default App;