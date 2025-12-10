import { ReactNode, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useDashboardMode } from "@/lib/DashboardContext";

import { Sidebar } from "./SidebarNew";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";
import { useAdmin } from '@/lib/AdminContext';
import Footer from "@/components/Footer";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { viewMode, setViewMode } = useDashboardMode();
  const location = useLocation();
  const navigate = useNavigate();
  const { adminSettings } = useAdmin();

  // persist preference in localStorage
  useEffect(() => {
    try {
      const v = localStorage.getItem('tradeone.sidebarOpen');
      if (v !== null) setSidebarOpen(v === '1');
    } catch (e) {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('tradeone.sidebarOpen', sidebarOpen ? '1' : '0') } catch (e) {}
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar: animate width/opacity instead of unmounting for smooth transitions */}
      <aside
        className={cn(
          "hidden lg:block border-r border-border glass-strong transition-all duration-300 ease-in-out relative overflow-visible",
          // only change width here; visual hiding of inner content is handled by the Sidebar `collapsed` prop
          sidebarOpen ? "w-64" : "w-0",
        )}
      >
        <Sidebar collapsed={!sidebarOpen} onToggle={() => setSidebarOpen((s) => !s)} viewMode={viewMode} />
      </aside>

      {/* (toggle anchored inside the aside) */}

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 glass-strong">
          <Sidebar onNavigate={() => setMobileOpen(false)} viewMode={viewMode} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Menu Toggle Button */}
        <div className="lg:hidden p-3 sm:p-4 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="h-10 w-10 hover:bg-accent/20"
            aria-label="Open menu"
          >
            <PanelLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm font-semibold text-muted-foreground">Menu</span>
        </div>

        {/* Desktop Sidebar Toggle Button - visible only on lg screens */}
        <div className="hidden lg:flex p-3 sm:p-4 border-b border-border/50 bg-background/50 backdrop-blur-sm items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen((s) => !s)}
            className="h-9 w-9 hover:bg-accent/20 transition-all duration-200"
            aria-label="Toggle sidebar"
          >
            <PanelLeft className={cn("w-5 h-5 transition-transform duration-200", !sidebarOpen && "rotate-180")} />
          </Button>
          <span className="text-sm font-semibold text-muted-foreground">{sidebarOpen ? 'Hide' : 'Show'} Sidebar</span>
        </div>

        <main className={cn("flex-1 overflow-auto transition-all duration-300")}>
          {/* Responsive padding and view mode toggle */}
          <div className="p-3 sm:p-4 lg:p-8 space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="inline-flex rounded-lg bg-muted/50 border border-border/60 p-1 sm:p-1.5 shadow-sm backdrop-blur-sm">
                <button
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-md transition-all duration-200 ${
                    viewMode === 'propfirm'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:shadow-xl'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  }`}
                  onClick={() => { setViewMode('propfirm'); navigate('/dashboard/propfirm'); }}
                  aria-pressed={viewMode === 'propfirm'}
                >
                  Prop Firms
                </button>
                <button
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-md transition-all duration-200 ${
                    viewMode === 'journal'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg hover:shadow-xl'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  }`}
                  onClick={() => { setViewMode('journal'); navigate('/dashboard/journal'); }}
                  aria-pressed={viewMode === 'journal'}
                >
                  Journal
                </button>
              </div>
            </div>
            {children}
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Modals removed from layout — content moved to landing page as transparent cards */}
    </div>
  );
};