import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Wallet,
  Copy,
  BookOpen,
  DollarSign,
  Settings,
  LogOut,
  PanelLeft,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/ui/BrandLogo";
import SidebarItem from "./SidebarItem";

interface SidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
  /** which dashboard view to show - 'propfirm' shows account/prop-firm management items, 'journal' shows journaling items */
  viewMode?: 'propfirm' | 'journal';
}

// Prop-firm dashboard menu: includes dashboard overview, journal link, performance and settings
// Prop-firm dashboard menu: keep existing pages (except Trade Copier)
const propfirmMenu = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Wallet, label: "Accounts", path: "/dashboard/accounts" },
  { icon: DollarSign, label: "Payouts", path: "/dashboard/payouts" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

// Journal-only menu: dashboard (calendar-style), journal entry, performance, settings
const journalMenu = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: BookOpen, label: "Journal", path: "/dashboard/journal" },
  { icon: LayoutDashboard, label: "Performance", path: "/dashboard/performance" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

export const Sidebar = ({ onNavigate, collapsed = false, onToggle, viewMode = 'propfirm' }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Check if user is admin
  const isAdmin = user?.user_metadata?.role === 'admin';

  const handleClick = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <div className="h-full flex flex-col relative sidebar-bg sidebar-font">
      <div className={cn("h-full flex flex-col", collapsed ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto")}>
        <div className="p-6 border-b border-border/50 bg-gradient-to-b from-background to-background/50 backdrop-blur-sm">
          <Link to="/dashboard" onClick={handleClick} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <BrandLogo size={28} />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent brand-font">TradeOne</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {((viewMode === 'journal') ? journalMenu : propfirmMenu).map((item) => (
            <SidebarItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              path={item.path}
              onClick={handleClick}
              isActive={location.pathname === item.path}
              collapsed={collapsed}
            />
          ))}
          
          {/* Admin Menu Item - Only show if user is admin */}
          {isAdmin && (
            <div className="pt-4 border-t border-border/50">
              <SidebarItem
                icon={Shield}
                label="Admin Panel"
                path="/admin"
                onClick={handleClick}
                isActive={location.pathname === '/admin'}
                collapsed={collapsed}
              />
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-border/50 bg-gradient-to-t from-background/80 to-transparent backdrop-blur-sm">
          <div>
            <Button
              variant="ghost"
              className="w-full flex items-center gap-3 py-3.5 px-3 text-destructive hover:text-destructive/80 hover:bg-destructive/5 transition-all duration-200 rounded-lg border border-transparent hover:border-destructive/20"
                onClick={async () => {
                try {
                  await signOut();
                } catch (e) {
                  // ignore sign out errors
                }
                // ensure any parent handlers run (closing drawer etc.)
                handleClick();
                // navigate to login page
                try {
                  navigate('/login');
                } catch (e) {
                  // fallback: no-op
                }
              }}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 text-left font-medium text-sm">Logout</span>
            </Button>
          </div>
        </div>
      </div>

      {onToggle && collapsed && (
        <div className="fixed left-4 top-4 z-50">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggle} 
            aria-label="Toggle sidebar" 
            className="h-10 w-10 shadow-md bg-background/90 backdrop-blur-sm hover:bg-accent/10 hover:text-accent transition-all duration-200 rounded-lg border border-border/50 hover:border-accent/30 hover:shadow-lg"
          >
            <PanelLeft className={cn('w-5 h-5 transition-transform duration-200', collapsed && 'rotate-180')} />
          </Button>
        </div>
      )}

    </div>
  );
};

export default Sidebar;
