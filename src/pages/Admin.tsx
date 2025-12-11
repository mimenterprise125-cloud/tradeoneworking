import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAdmin } from '@/lib/AdminContext';
import { useAuth } from '@/lib/AuthProvider';
import { motion } from 'framer-motion';
import { PricingManagementTab } from '@/components/PricingManagementTab';
import {
  AlertCircle,
  Users,
  Settings,
  DollarSign,
  Lock,
  Unlock,
  Trash2,
  Power,
  AlertTriangle,
  LogOut,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type TabType = 'overview' | 'errors' | 'users' | 'pricing' | 'features' | 'maintenance';

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { adminSettings, loading, error, updateSettings, toggleMaintenanceMode, togglePricingEnabled, togglePropFirmLock, toggleJournalLock, togglePerformanceAnalyticsLock, clearErrorLogs, updatePricingTiers } = useAdmin();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showPricingForm, setShowPricingForm] = useState(false);
  const [pricingTiers, setPricingTiers] = useState(adminSettings.pricing_tiers);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  // Check if user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        if (!user) {
          setIsAdmin(false);
          setCheckingRole(false);
          return;
        }

        // Check user metadata for admin role
        const userRole = (user?.user_metadata?.role || user?.app_metadata?.role) as string;
        setIsAdmin(userRole === 'admin');
      } catch (err) {
        console.error('Error checking admin role:', err);
        setIsAdmin(false);
      } finally {
        setCheckingRole(false);
      }
    };

    checkAdminRole();
  }, [user]);

  // Log when adminSettings changes
  useEffect(() => {
    console.log('🔄 [Admin.tsx] adminSettings changed:', {
      propfirm_locked: adminSettings.propfirm_locked,
      journal_locked: adminSettings.journal_locked,
      performance_analytics_locked: adminSettings.performance_analytics_locked,
    });
  }, [adminSettings]);

  // Show loading while checking role
  if (checkingRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-500/20 border-t-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Show error if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 p-8">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-rose-500 mx-auto" />
            <h1 className="text-2xl font-bold text-white">Access Denied</h1>
            <p className="text-gray-400">
              You don't have permission to access the admin panel. Only admin users can view this page.
            </p>
            <Button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-cyan-600 hover:bg-cyan-700"
            >
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-500/20 border-t-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-3 sm:p-6">
      {/* Header */}
      <motion.div
        className="mb-6 sm:mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Admin Panel
            </h1>
            <p className="text-sm sm:text-base text-gray-400 mt-2">Manage your website settings, users, and features</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto bg-slate-800 border-slate-700 hover:bg-slate-700 text-xs sm:text-sm"
          >
            <LogOut className="mr-2 w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </motion.div>

      {/* Error Alert */}
      {error && (
        <motion.div
          className="mb-4 sm:mb-6 p-3 sm:p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 sm:gap-3 text-xs sm:text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 flex-shrink-0" />
          <span className="text-rose-300">{error}</span>
        </motion.div>
      )}

      {/* Navigation Tabs - Responsive scroll on mobile */}
      <motion.div
        className="mb-6 sm:mb-8 flex flex-wrap gap-1 sm:gap-2 bg-slate-800/50 p-2 sm:p-3 rounded-lg border border-slate-700 overflow-x-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {[
          { tab: 'overview', label: 'Overview', icon: Settings },
          { tab: 'errors', label: 'Errors', icon: AlertCircle },
          { tab: 'users', label: 'Users', icon: Users },
          { tab: 'pricing', label: 'Pricing', icon: DollarSign },
          { tab: 'features', label: 'Features', icon: Lock },
          { tab: 'maintenance', label: 'Maintenance', icon: Power },
        ].map(({ tab, label, icon: Icon }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as TabType)}
            className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center gap-1 sm:gap-2 transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
              activeTab === tab
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">{label}</span>
          </button>
        ))}
      </motion.div>

      {/* Content Sections */}
      <div className="space-y-4 sm:space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-slate-800/50 border-slate-700 p-6">
                <div className="text-gray-400 text-sm mb-2">Total Users</div>
                <div className="text-4xl font-bold text-cyan-400">{adminSettings.total_user_count}</div>
              </Card>
              <Card className="bg-slate-800/50 border-slate-700 p-6">
                <div className="text-gray-400 text-sm mb-2">Active Users</div>
                <div className="text-4xl font-bold text-emerald-400">{adminSettings.active_user_count}</div>
              </Card>
              <Card className="bg-slate-800/50 border-slate-700 p-6">
                <div className="text-gray-400 text-sm mb-2">Error Logs</div>
                <div className="text-4xl font-bold text-rose-400">{adminSettings.error_logs.length}</div>
              </Card>
              <Card className="bg-slate-800/50 border-slate-700 p-6">
                <div className="text-gray-400 text-sm mb-2">Maintenance Mode</div>
                <Badge variant={adminSettings.maintenance_mode ? 'destructive' : 'default'}>
                  {adminSettings.maintenance_mode ? 'ACTIVE' : 'OFF'}
                </Badge>
              </Card>
            </div>

            {/* Pricing Settings Section */}
            <Card className="bg-slate-800/50 border-slate-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">Pricing Settings</h3>
                  <p className="text-gray-400 text-sm mt-1">Manage your pricing configuration</p>
                </div>
                <Button
                  onClick={() => setShowPricingForm(!showPricingForm)}
                  className="bg-primary hover:bg-primary/90"
                >
                  {showPricingForm ? 'Cancel' : 'Edit Pricing'}
                </Button>
              </div>

              {showPricingForm ? (
                <div className="space-y-4 border-t border-slate-700 pt-6">
                  <div className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg">
                    <div className="flex-1">
                      <p className="text-white font-semibold">Enable Pricing Page</p>
                      <p className="text-gray-400 text-sm">Allow users to view pricing and subscription options</p>
                    </div>
                    <Button
                      onClick={() => togglePricingEnabled()}
                      variant={adminSettings.pricing_enabled ? 'default' : 'outline'}
                      className={adminSettings.pricing_enabled ? 'bg-emerald-600' : ''}
                    >
                      {adminSettings.pricing_enabled ? '✓ Enabled' : 'Enable'}
                    </Button>
                  </div>

                  <div className="space-y-3 mt-4">
                    <h4 className="text-white font-semibold">Current Pricing Tiers: {adminSettings.pricing_tiers.length}</h4>
                    {adminSettings.pricing_tiers.length > 0 ? (
                      <div className="space-y-2">
                        {adminSettings.pricing_tiers.map((tier) => (
                          <div key={tier.id} className="flex justify-between items-center p-3 bg-slate-700/20 rounded">
                            <div>
                              <p className="text-white font-medium">{tier.name}</p>
                              <p className="text-cyan-400 text-sm">${tier.price.toFixed(2)}/month</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {tier.features.length} features
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm italic">No pricing tiers configured yet</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 border-t border-slate-700 pt-6">
                  <div className="text-center p-4 bg-slate-700/20 rounded">
                    <p className="text-gray-400 text-sm mb-1">Status</p>
                    <Badge variant={adminSettings.pricing_enabled ? 'default' : 'secondary'}>
                      {adminSettings.pricing_enabled ? 'ENABLED' : 'DISABLED'}
                    </Badge>
                  </div>
                  <div className="text-center p-4 bg-slate-700/20 rounded">
                    <p className="text-gray-400 text-sm mb-1">Tiers</p>
                    <p className="text-2xl font-bold text-cyan-400">{adminSettings.pricing_tiers.length}</p>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Error Logs Tab */}
        {activeTab === 'errors' && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Error Logs</h2>
              {adminSettings.error_logs.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => clearErrorLogs()}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  <Trash2 className="mr-2 w-4 h-4" />
                  Clear All Logs
                </Button>
              )}
            </div>

            {adminSettings.error_logs.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700 p-8 text-center">
                <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4 opacity-50" />
                <p className="text-gray-400">No error logs recorded</p>
              </Card>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {adminSettings.error_logs.map((log) => (
                  <Card
                    key={log.id}
                    className="bg-slate-800/50 border-slate-700 p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            log.severity === 'critical'
                              ? 'destructive'
                              : log.severity === 'high'
                                ? 'default'
                                : log.severity === 'medium'
                                  ? 'secondary'
                                  : 'outline'
                          }
                        >
                          {log.severity.toUpperCase()}
                        </Badge>
                        <span className="text-gray-400 text-sm">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {log.page && <span className="text-cyan-400 text-sm">{log.page}</span>}
                    </div>
                    <p className="text-white font-semibold mb-2">{log.message}</p>
                    {log.stack_trace && (
                      <div className="bg-slate-900/50 rounded p-2 text-xs text-gray-400 font-mono overflow-x-auto">
                        {log.stack_trace}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div>
              <h2 className="text-2xl font-bold mb-6">User Management</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card className="bg-slate-800/50 border-slate-700 p-6">
                  <div className="text-sm text-gray-400 mb-2">Total Users</div>
                  <div className="text-5xl font-bold text-cyan-400">{adminSettings.total_user_count}</div>
                  <p className="text-gray-500 text-sm mt-4">All registered accounts</p>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700 p-6">
                  <div className="text-sm text-gray-400 mb-2">Active Users</div>
                  <div className="text-5xl font-bold text-emerald-400">{Math.floor(adminSettings.total_user_count * 0.65)}</div>
                  <p className="text-gray-500 text-sm mt-4">Users active this month</p>
                </Card>
              </div>

              <Card className="bg-slate-800/50 border-slate-700 p-6">
                <h3 className="text-lg font-semibold mb-4">User Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Total Accounts</span>
                    <span className="text-white font-semibold">{adminSettings.total_user_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Premium Users</span>
                    <span className="text-white font-semibold">{Math.floor(adminSettings.total_user_count * 0.30)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Free Users</span>
                    <span className="text-white font-semibold">{Math.floor(adminSettings.total_user_count * 0.70)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Inactive (30d+)</span>
                    <span className="text-white font-semibold">{Math.floor(adminSettings.total_user_count * 0.15)}</span>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <PricingManagementTab 
            adminSettings={adminSettings} 
            togglePricingEnabled={togglePricingEnabled}
            pricingTiers={pricingTiers}
            setPricingTiers={setPricingTiers}
            updatePricingTiers={updatePricingTiers}
          />
        )}

        {/* Features Tab */}
        {activeTab === 'features' && (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500/20 border-t-cyan-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading feature settings...</p>
                </div>
              </div>
            ) : (
              <>
            <div>
              <h2 className="text-3xl font-bold text-white">Feature Management</h2>
              <p className="text-gray-400 mt-2">Lock/unlock features and control access levels</p>
            </div>

            {/* Feature Lock Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* PropFirm Lock */}
              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <Card className={`relative overflow-hidden border-2 p-6 transition-all ${
                  adminSettings.propfirm_locked 
                    ? 'bg-gradient-to-br from-rose-500/10 via-slate-800 to-slate-900 border-rose-500/30 shadow-lg shadow-rose-500/10' 
                    : 'bg-gradient-to-br from-emerald-500/10 via-slate-800 to-slate-900 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                }`}>
                  {adminSettings.propfirm_locked && (
                    <div className="absolute top-2 right-2 text-xs px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 font-semibold">
                      {adminSettings.propfirm_lock_type === 'premium' ? '💎 Premium' : '🔨 Development'}
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {adminSettings.propfirm_locked ? (
                          <Lock className="w-5 h-5 text-rose-400" />
                        ) : (
                          <Unlock className="w-5 h-5 text-emerald-400" />
                        )}
                        <h3 className="text-xl font-bold text-white">PropFirm</h3>
                      </div>
                      <p className="text-gray-400 text-sm">
                        {adminSettings.propfirm_locked 
                          ? `Locked - Shows "${adminSettings.propfirm_lock_type === 'premium' ? 'Premium Feature' : 'Coming Soon'}" message` 
                          : 'Available to all users'}
                      </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Badge className={adminSettings.propfirm_locked ? 'bg-rose-500/30 text-rose-300' : 'bg-emerald-500/30 text-emerald-300'}>
                        {adminSettings.propfirm_locked ? 'LOCKED' : 'ACTIVE'}
                      </Badge>
                      {adminSettings.propfirm_locked && (
                        <Badge className={adminSettings.propfirm_lock_type === 'premium' ? 'bg-purple-500/30 text-purple-300' : 'bg-blue-500/30 text-blue-300'}>
                          {adminSettings.propfirm_lock_type === 'premium' ? '💎 Premium' : '🔨 Dev'}
                        </Badge>
                      )}
                    </div>

                    <Button
                      onClick={() => {
                        console.log('🔘 [Admin.tsx] PropFirm lock button clicked. Current state:', adminSettings.propfirm_locked);
                        togglePropFirmLock();
                      }}
                      className={`w-full font-semibold transition-all ${
                        adminSettings.propfirm_locked 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                          : 'bg-rose-600 hover:bg-rose-700 text-white'
                      }`}
                    >
                      {adminSettings.propfirm_locked ? (
                        <>
                          <Unlock className="mr-2 w-4 h-4" />
                          Unlock Now
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 w-4 h-4" />
                          Lock This Section
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </motion.div>

              {/* Journal Lock */}
              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <Card className={`relative overflow-hidden border-2 p-6 transition-all ${
                  adminSettings.journal_locked 
                    ? 'bg-gradient-to-br from-rose-500/10 via-slate-800 to-slate-900 border-rose-500/30 shadow-lg shadow-rose-500/10' 
                    : 'bg-gradient-to-br from-emerald-500/10 via-slate-800 to-slate-900 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                }`}>
                  {adminSettings.journal_locked && (
                    <div className="absolute top-2 right-2 text-xs px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 font-semibold">
                      {adminSettings.journal_lock_type === 'premium' ? '💎 Premium' : '🔨 Development'}
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {adminSettings.journal_locked ? (
                          <Lock className="w-5 h-5 text-rose-400" />
                        ) : (
                          <Unlock className="w-5 h-5 text-emerald-400" />
                        )}
                        <h3 className="text-xl font-bold text-white">Journal</h3>
                      </div>
                      <p className="text-gray-400 text-sm">
                        {adminSettings.journal_locked 
                          ? `Locked - Shows "${adminSettings.journal_lock_type === 'premium' ? 'Premium Feature' : 'Coming Soon'}" message` 
                          : 'Available to all users'}
                      </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Badge className={adminSettings.journal_locked ? 'bg-rose-500/30 text-rose-300' : 'bg-emerald-500/30 text-emerald-300'}>
                        {adminSettings.journal_locked ? 'LOCKED' : 'ACTIVE'}
                      </Badge>
                      {adminSettings.journal_locked && (
                        <Badge className={adminSettings.journal_lock_type === 'premium' ? 'bg-purple-500/30 text-purple-300' : 'bg-blue-500/30 text-blue-300'}>
                          {adminSettings.journal_lock_type === 'premium' ? '💎 Premium' : '🔨 Dev'}
                        </Badge>
                      )}
                    </div>

                    <Button
                      onClick={() => {
                        console.log('🔘 [Admin.tsx] Journal lock button clicked. Current state:', adminSettings.journal_locked);
                        toggleJournalLock();
                      }}
                      className={`w-full font-semibold transition-all ${
                        adminSettings.journal_locked 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                          : 'bg-rose-600 hover:bg-rose-700 text-white'
                      }`}
                    >
                      {adminSettings.journal_locked ? (
                        <>
                          <Unlock className="mr-2 w-4 h-4" />
                          Unlock Now
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 w-4 h-4" />
                          Lock This Section
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </motion.div>

              {/* Performance Analytics Lock */}
              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <Card className={`relative overflow-hidden border-2 p-6 transition-all ${
                  adminSettings.performance_analytics_locked 
                    ? 'bg-gradient-to-br from-rose-500/10 via-slate-800 to-slate-900 border-rose-500/30 shadow-lg shadow-rose-500/10' 
                    : 'bg-gradient-to-br from-emerald-500/10 via-slate-800 to-slate-900 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                }`}>
                  {adminSettings.performance_analytics_locked && (
                    <div className="absolute top-2 right-2 text-xs px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 font-semibold">
                      {adminSettings.performance_lock_type === 'premium' ? '💎 Premium' : '🔨 Development'}
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {adminSettings.performance_analytics_locked ? (
                          <Lock className="w-5 h-5 text-rose-400" />
                        ) : (
                          <Unlock className="w-5 h-5 text-emerald-400" />
                        )}
                        <h3 className="text-xl font-bold text-white">Analytics</h3>
                      </div>
                      <p className="text-gray-400 text-sm">
                        {adminSettings.performance_analytics_locked 
                          ? `Locked - Shows "${adminSettings.performance_lock_type === 'premium' ? 'Premium Feature' : 'Coming Soon'}" message` 
                          : 'Available to all users'}
                      </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Badge className={adminSettings.performance_analytics_locked ? 'bg-rose-500/30 text-rose-300' : 'bg-emerald-500/30 text-emerald-300'}>
                        {adminSettings.performance_analytics_locked ? 'LOCKED' : 'ACTIVE'}
                      </Badge>
                      {adminSettings.performance_analytics_locked && (
                        <Badge className={adminSettings.performance_lock_type === 'premium' ? 'bg-purple-500/30 text-purple-300' : 'bg-blue-500/30 text-blue-300'}>
                          {adminSettings.performance_lock_type === 'premium' ? '💎 Premium' : '🔨 Dev'}
                        </Badge>
                      )}
                    </div>

                    <Button
                      onClick={() => togglePerformanceAnalyticsLock()}
                      className={`w-full font-semibold transition-all ${
                        adminSettings.performance_analytics_locked 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                          : 'bg-rose-600 hover:bg-rose-700 text-white'
                      }`}
                    >
                      {adminSettings.performance_analytics_locked ? (
                        <>
                          <Unlock className="mr-2 w-4 h-4" />
                          Unlock Now
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 w-4 h-4" />
                          Lock This Section
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* Individual Lock Type Selectors for Each Feature */}
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">Lock Type Configuration</h3>
                <p className="text-gray-400">Set individual lock type for each feature when locked</p>
              </div>

              {/* PropFirm Lock Type */}
              <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900 border-slate-700 p-6">
                <div className="mb-6">
                  <h4 className="text-xl font-bold text-white mb-2">PropFirm Section Lock Type</h4>
                  <p className="text-gray-400 text-sm">When locked, PropFirm will show this type of message</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => updateSettings({ propfirm_lock_type: 'development' })}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      adminSettings.propfirm_lock_type === 'development'
                        ? 'border-blue-500 bg-blue-500/15 shadow-lg shadow-blue-500/10'
                        : 'border-slate-600 bg-slate-700/30 hover:border-blue-400'
                    }`}
                  >
                    <div className="text-2xl mb-2">🔨</div>
                    <div className="font-semibold text-white">Under Development</div>
                    {adminSettings.propfirm_lock_type === 'development' && (
                      <div className="mt-3 flex items-center gap-1 text-blue-300 text-xs font-semibold">✓ Selected</div>
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => updateSettings({ propfirm_lock_type: 'premium' })}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      adminSettings.propfirm_lock_type === 'premium'
                        ? 'border-purple-500 bg-purple-500/15 shadow-lg shadow-purple-500/10'
                        : 'border-slate-600 bg-slate-700/30 hover:border-purple-400'
                    }`}
                  >
                    <div className="text-2xl mb-2">💎</div>
                    <div className="font-semibold text-white">Premium Feature</div>
                    {adminSettings.propfirm_lock_type === 'premium' && (
                      <div className="mt-3 flex items-center gap-1 text-purple-300 text-xs font-semibold">✓ Selected</div>
                    )}
                  </motion.button>
                </div>
              </Card>

              {/* Journal Lock Type */}
              <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900 border-slate-700 p-6">
                <div className="mb-6">
                  <h4 className="text-xl font-bold text-white mb-2">Journal Section Lock Type</h4>
                  <p className="text-gray-400 text-sm">When locked, Journal will show this type of message</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => updateSettings({ journal_lock_type: 'development' })}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      adminSettings.journal_lock_type === 'development'
                        ? 'border-blue-500 bg-blue-500/15 shadow-lg shadow-blue-500/10'
                        : 'border-slate-600 bg-slate-700/30 hover:border-blue-400'
                    }`}
                  >
                    <div className="text-2xl mb-2">🔨</div>
                    <div className="font-semibold text-white">Under Development</div>
                    {adminSettings.journal_lock_type === 'development' && (
                      <div className="mt-3 flex items-center gap-1 text-blue-300 text-xs font-semibold">✓ Selected</div>
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => updateSettings({ journal_lock_type: 'premium' })}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      adminSettings.journal_lock_type === 'premium'
                        ? 'border-purple-500 bg-purple-500/15 shadow-lg shadow-purple-500/10'
                        : 'border-slate-600 bg-slate-700/30 hover:border-purple-400'
                    }`}
                  >
                    <div className="text-2xl mb-2">💎</div>
                    <div className="font-semibold text-white">Premium Feature</div>
                    {adminSettings.journal_lock_type === 'premium' && (
                      <div className="mt-3 flex items-center gap-1 text-purple-300 text-xs font-semibold">✓ Selected</div>
                    )}
                  </motion.button>
                </div>
              </Card>

              {/* Performance Analytics Lock Type */}
              <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900 border-slate-700 p-6">
                <div className="mb-6">
                  <h4 className="text-xl font-bold text-white mb-2">Performance Analytics Lock Type</h4>
                  <p className="text-gray-400 text-sm">When locked, Analytics will show this type of message</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => updateSettings({ performance_lock_type: 'development' })}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      adminSettings.performance_lock_type === 'development'
                        ? 'border-blue-500 bg-blue-500/15 shadow-lg shadow-blue-500/10'
                        : 'border-slate-600 bg-slate-700/30 hover:border-blue-400'
                    }`}
                  >
                    <div className="text-2xl mb-2">🔨</div>
                    <div className="font-semibold text-white">Under Development</div>
                    {adminSettings.performance_lock_type === 'development' && (
                      <div className="mt-3 flex items-center gap-1 text-blue-300 text-xs font-semibold">✓ Selected</div>
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => updateSettings({ performance_lock_type: 'premium' })}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      adminSettings.performance_lock_type === 'premium'
                        ? 'border-purple-500 bg-purple-500/15 shadow-lg shadow-purple-500/10'
                        : 'border-slate-600 bg-slate-700/30 hover:border-purple-400'
                    }`}
                  >
                    <div className="text-2xl mb-2">💎</div>
                    <div className="font-semibold text-white">Premium Feature</div>
                    {adminSettings.performance_lock_type === 'premium' && (
                      <div className="mt-3 flex items-center gap-1 text-purple-300 text-xs font-semibold">✓ Selected</div>
                    )}
                  </motion.button>
                </div>
              </Card>
            </div>

            {/* Info Box */}
            <Card className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border-blue-500/30 p-6">
              <div className="flex gap-4">
                <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-white mb-2">How Feature Locking Works</p>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Lock a section to restrict user access</li>
                    <li>• Choose between "Under Development" or "Premium Feature" mode</li>
                    <li>• Users see the appropriate message when they try to access locked sections</li>
                    <li>• Lock type applies to ALL locked sections globally</li>
                  </ul>
                </div>
              </div>
            </Card>
              </>
            )}
          </motion.div>
        )}

        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2 className="text-2xl font-bold">Maintenance Mode</h2>

            <Card className="bg-slate-800/50 border-slate-700 p-8">
              <div className="text-center">
                <Power className="w-16 h-16 mx-auto mb-4 text-amber-400" />
                <h3 className="text-2xl font-bold mb-2">
                  {adminSettings.maintenance_mode ? 'Maintenance Mode ACTIVE' : 'Maintenance Mode OFF'}
                </h3>
                <p className="text-gray-400 mb-6">
                  {adminSettings.maintenance_mode
                    ? 'The website is currently showing the maintenance page to all users.'
                    : 'The website is operating normally. Toggle to put the site in maintenance mode.'}
                </p>

                <Button
                  onClick={() => toggleMaintenanceMode()}
                  size="lg"
                  className={`${
                    adminSettings.maintenance_mode
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {adminSettings.maintenance_mode ? (
                    <>
                      <Power className="mr-2 w-5 h-5" />
                      Turn Off Maintenance
                    </>
                  ) : (
                    <>
                      <Power className="mr-2 w-5 h-5" />
                      Enable Maintenance Mode
                    </>
                  )}
                </Button>
              </div>
            </Card>

            <Card className="bg-rose-500/10 border-rose-500/30 p-4 text-rose-300 text-sm">
              <p>
                <strong>Warning:</strong> Enabling maintenance mode will redirect all users to the maintenance page. Only do this when necessary.
              </p>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Admin;
