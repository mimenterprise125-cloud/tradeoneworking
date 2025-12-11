import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import supabase from './supabase';

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  features: string[];
  locked_sections: string[];
}

export interface SocialLink {
  id: string;
  link_type: 'community' | 'footer';
  label: string;
  url: string;
  order: number;
  created_at?: string;
  updated_at?: string;
}

export interface AdminSettings {
  pricing_enabled: boolean;
  pricing_tiers: PricingTier[];
  maintenance_mode: boolean;
  propfirm_locked: boolean;
  journal_locked: boolean;
  performance_analytics_locked: boolean;
  lockType: 'development' | 'premium'; // Legacy - kept for backward compatibility
  propfirm_lock_type: 'development' | 'premium';
  journal_lock_type: 'development' | 'premium';
  performance_lock_type: 'development' | 'premium';
  active_user_count: number;
  total_user_count: number;
  error_logs: ErrorLog[];
  locked_sections: string[];
  community_links: SocialLink[];
  footer_social_links: SocialLink[];
}

export interface ErrorLog {
  id: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  stack_trace?: string;
  user_id?: string;
  page?: string;
}

interface AdminContextType {
  adminSettings: AdminSettings;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<AdminSettings>) => Promise<void>;
  toggleMaintenanceMode: () => Promise<void>;
  togglePricingEnabled: () => Promise<void>;
  togglePropFirmLock: () => Promise<void>;
  toggleJournalLock: () => Promise<void>;
  togglePerformanceAnalyticsLock: () => Promise<void>;
  addErrorLog: (error: Omit<ErrorLog, 'id' | 'timestamp'>) => Promise<void>;
  clearErrorLogs: () => Promise<void>;
  updatePricingTiers: (tiers: PricingTier[]) => Promise<void>;
  updateSocialLinks: (links: SocialLink[]) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    pricing_enabled: false,
    pricing_tiers: [],
    maintenance_mode: false,
    propfirm_locked: false,
    journal_locked: false,
    performance_analytics_locked: false,
    lockType: 'development',
    propfirm_lock_type: 'development',
    journal_lock_type: 'development',
    performance_lock_type: 'development',
    active_user_count: 0,
    total_user_count: 0,
    error_logs: [],
    locked_sections: [],
    community_links: [],
    footer_social_links: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch admin settings on mount and subscribe to real-time changes
  useEffect(() => {
    fetchAdminSettings(true); // Show loading on initial mount

    // Small helper refs to track realtime activity and polling
    const lastRealtimeAt = { current: 0 } as { current: number };
    const pollingRef = { current: 0 } as { current: number };

    // Subscribe to real-time updates using Supabase RealtimePostgresChangesPayload
    const channel = supabase.channel('admin_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_settings',
          filter: 'id=eq.default',
        },
        (payload) => {
          //console.log('', payload);
          // mark realtime as seen and refetch silently
          lastRealtimeAt.current = Date.now();
          fetchAdminSettings(false);
        }
      )
      .subscribe((status) => {
        //console.log('📡 Realtime subscription status:', status);
      });

    // Conservative polling fallback: if no realtime event seen, poll every 10s
    // This handles environments where realtime isn't delivered reliably.
    pollingRef.current = window.setInterval(() => {
      try {
        const now = Date.now();
        // If we've never seen a realtime event or it's been >10s since last one, refetch
        if (!lastRealtimeAt.current || now - lastRealtimeAt.current > 10000) {
          //console.log('� Polling fallback: fetching admin settings (no recent realtime)');
          fetchAdminSettings(false);
        }
      } catch (err) {
        console.warn('Polling fallback error:', err);
      }
    }, 10000);

    return () => {
      console.log('�🔌 Unsubscribing from admin_settings_changes and stopping polling');
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.warn('Failed to remove supabase channel:', e);
      }
      try {
        if (pollingRef.current) window.clearInterval(pollingRef.current as number);
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const fetchAdminSettings = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('admin_settings')
        .select('*')
        .single();

      //console.log('📥 Fetched admin settings from database:', data);

      // If table doesn't exist (406) or no data found (PGRST116), just use defaults
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.warn('Admin settings table may not exist yet. Using defaults.', fetchError);
      }

      if (data) {
        //console.log('✓ Lock status - propfirm_locked:', data.propfirm_locked, 'journal_locked:', data.journal_locked);
        setAdminSettings({
          pricing_enabled: data.pricing_enabled || false,
          pricing_tiers: data.pricing_tiers || [],
          maintenance_mode: data.maintenance_mode || false,
          propfirm_locked: data.propfirm_locked || false,
          journal_locked: data.journal_locked || false,
          performance_analytics_locked: data.performance_analytics_locked || false,
          lockType: data.lock_type || 'development',
          propfirm_lock_type: data.propfirm_lock_type || 'development',
          journal_lock_type: data.journal_lock_type || 'development',
          performance_lock_type: data.performance_lock_type || 'development',
          active_user_count: data.active_user_count || 0,
          total_user_count: data.total_user_count || 0,
          error_logs: data.error_logs || [],
          locked_sections: data.locked_sections || [],
          community_links: data.community_links || [],
          footer_social_links: data.footer_social_links || [],
        });
      }

      // Fetch active user count
      await fetchUserCounts();

      // Fetch error logs
      await fetchErrorLogs();

      // Fetch social links
      await fetchSocialLinks();
    } catch (err) {
      console.warn('Failed to fetch admin settings:', err);
      setError('Admin settings table not yet created. Run the migration.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchUserCounts = async () => {
    try {
      // Get current user to verify authentication
      const { data: { user } } = await supabase.auth.getUser();
      
      // If user not authenticated, set defaults
      if (!user) {
        console.log('❌ User not authenticated, setting default counts');
        setAdminSettings((prev) => ({
          ...prev,
          total_user_count: 1,
          active_user_count: 1,
        }));
        return;
      }

      let totalUsers = 0;
      let activeUsers = 0;

      // Method 1: Try to use the RPC function (includes real-time online tracking)
      try {
        const { data, error } = await supabase
          .rpc('get_user_count_stats');

        if (!error && data && data.length > 0) {
          console.log('✅ Got user counts from RPC:', data[0]);
          totalUsers = data[0].total_auth_users || data[0].total_profiles || 0;
          // Use real online users count if available, otherwise estimate
          activeUsers = data[0].online_users_count || Math.ceil(totalUsers * 0.65);
          console.log('📊 Online users (real-time):', activeUsers);
        }
      } catch (rpcErr) {
        console.log('⚠️ RPC function not available yet, falling back to profiles table');
      }

      // Method 2: If RPC didn't work, count from profiles table
      if (totalUsers === 0) {
        try {
          const { count, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

          if (!error && count) {
            console.log('✅ Got user count from profiles table:', count);
            totalUsers = count || 0;
            
            // Try to get real online count from user_sessions
            try {
              const { count: onlineCount, error: sessionError } = await supabase
                .from('user_sessions')
                .select('*', { count: 'exact', head: true })
                .gt('last_activity', new Date(Date.now() - 5 * 60 * 1000).toISOString());
              
              if (!sessionError && onlineCount !== null) {
                activeUsers = onlineCount;
                console.log('✅ Got online users from sessions:', activeUsers);
              } else {
                activeUsers = Math.ceil(totalUsers * 0.65);
              }
            } catch (sessionErr) {
              activeUsers = Math.ceil(totalUsers * 0.65);
            }
          }
        } catch (err) {
          console.log('⚠️ Could not count from profiles table:', err);
        }
      }

      // Method 3: Fallback - at least show current user
      if (totalUsers === 0) {
        totalUsers = 1;
        activeUsers = 1;
      }

      console.log('📊 Final user counts - Total:', totalUsers, 'Online:', activeUsers);
      
      setAdminSettings((prev) => ({
        ...prev,
        total_user_count: totalUsers,
        active_user_count: activeUsers,
      }));
    } catch (err) {
      console.warn('User count fetch error:', err);
      setAdminSettings((prev) => ({
        ...prev,
        total_user_count: Math.max(prev.total_user_count, 1),
        active_user_count: Math.max(prev.active_user_count, 1),
      }));
    }
  };

  const fetchErrorLogs = async () => {
    try {
      const { data, error: logsError } = await supabase
        .from('error_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (logsError) {
        console.warn('Error logs table may not exist yet:', logsError);
        return;
      }

      setAdminSettings((prev) => ({
        ...prev,
        error_logs: data || [],
      }));
    } catch (err) {
      console.warn('Failed to fetch error logs - table may not exist yet:', err);
    }
  };

  const fetchSocialLinks = async () => {
    try {
      const { data, error: linksError } = await supabase
        .from('admin_social_links')
        .select('*')
        .order('order', { ascending: true });

      if (linksError) {
        console.warn('Social links table may not exist yet:', linksError);
        return;
      }

      const communityLinks = (data || []).filter(link => link.link_type === 'community');
      const footerLinks = (data || []).filter(link => link.link_type === 'footer');

      setAdminSettings((prev) => ({
        ...prev,
        community_links: communityLinks,
        footer_social_links: footerLinks,
      }));
    } catch (err) {
      console.warn('Failed to fetch social links - table may not exist yet:', err);
    }
  };

  const updateSettings = async (updates: Partial<AdminSettings>) => {
    try {
      console.log('📝 Attempting to update settings with:', updates);
      
      // Map frontend field names to database column names
      const dbUpdates: Record<string, any> = {};
      
      if (updates.propfirm_locked !== undefined) {
        dbUpdates.propfirm_locked = updates.propfirm_locked;
        console.log('✏️ Setting propfirm_locked to:', updates.propfirm_locked);
      }
      if (updates.journal_locked !== undefined) {
        dbUpdates.journal_locked = updates.journal_locked;
        console.log('✏️ Setting journal_locked to:', updates.journal_locked);
      }
      if (updates.performance_analytics_locked !== undefined) dbUpdates.performance_analytics_locked = updates.performance_analytics_locked;
      if (updates.propfirm_lock_type !== undefined) dbUpdates.propfirm_lock_type = updates.propfirm_lock_type;
      if (updates.journal_lock_type !== undefined) dbUpdates.journal_lock_type = updates.journal_lock_type;
      if (updates.performance_lock_type !== undefined) dbUpdates.performance_lock_type = updates.performance_lock_type;
      if (updates.pricing_enabled !== undefined) dbUpdates.pricing_enabled = updates.pricing_enabled;
      if (updates.maintenance_mode !== undefined) dbUpdates.maintenance_mode = updates.maintenance_mode;
      if (updates.pricing_tiers !== undefined) dbUpdates.pricing_tiers = updates.pricing_tiers;
      if (updates.locked_sections !== undefined) dbUpdates.locked_sections = updates.locked_sections;
      
      dbUpdates.updated_at = new Date().toISOString();

      console.log('🗄️ Sending to database:', dbUpdates);

      const { error: updateError, data: updateData } = await supabase
        .from('admin_settings')
        .update(dbUpdates)
        .eq('id', 'default')
        .select();

      if (updateError) {
        console.error('❌ Failed to update admin settings:', updateError);
        setError(`Failed to save settings: ${updateError.message}`);
      } else {
        console.log('✅ Database update successful:', updateData);
      }

      // Update local state
      setAdminSettings((prev) => ({ ...prev, ...updates }));
    } catch (err) {
      console.error('❌ Failed to update settings:', err);
      setError(`Error updating settings: ${err}`);
      // Still update local state
      setAdminSettings((prev) => ({ ...prev, ...updates }));
    }
  };

  const toggleMaintenanceMode = async () => {
    await updateSettings({
      maintenance_mode: !adminSettings.maintenance_mode,
    });
  };

  const togglePricingEnabled = async () => {
    await updateSettings({
      pricing_enabled: !adminSettings.pricing_enabled,
    });
  };

  const togglePropFirmLock = async () => {
    await updateSettings({
      propfirm_locked: !adminSettings.propfirm_locked,
    });
  };

  const toggleJournalLock = async () => {
    await updateSettings({
      journal_locked: !adminSettings.journal_locked,
    });
  };

  const togglePerformanceAnalyticsLock = async () => {
    await updateSettings({
      performance_analytics_locked: !adminSettings.performance_analytics_locked,
    });
  };

  const addErrorLog = async (errorData: Omit<ErrorLog, 'id' | 'timestamp'>) => {
    try {
      const { error: insertError } = await supabase
        .from('error_logs')
        .insert([
          {
            ...errorData,
            timestamp: new Date().toISOString(),
          },
        ]);

      if (insertError) throw insertError;

      await fetchErrorLogs();
    } catch (err) {
      console.error('Failed to add error log:', err);
    }
  };

  const clearErrorLogs = async () => {
    try {
      const { error: deleteError } = await supabase
        .from('error_logs')
        .delete()
        .neq('id', '');

      if (deleteError) throw deleteError;

      setAdminSettings((prev) => ({
        ...prev,
        error_logs: [],
      }));
    } catch (err) {
      console.error('Failed to clear error logs:', err);
      setError('Failed to clear error logs');
      throw err;
    }
  };

  const updatePricingTiers = async (tiers: PricingTier[]) => {
    await updateSettings({
      pricing_tiers: tiers,
    });
  };

  const updateSocialLinks = async (links: SocialLink[]) => {
    try {
      console.log('💾 Saving social links:', links);
      
      // Separate links by type
      const communityLinks = links.filter(l => l.link_type === 'community');
      const footerLinks = links.filter(l => l.link_type === 'footer');

      // Sanitize and validate URLs before saving
      const sanitizeUrl = (url: string): string => {
        try {
          // Ensure URL is properly formatted
          let sanitized = url.trim();
          
          // Remove any duplicate protocols
          while (sanitized.includes('://')) {
            const firstIndex = sanitized.indexOf('://');
            const beforeProtocol = sanitized.substring(0, firstIndex);
            if (beforeProtocol.includes('://')) {
              // Remove the extra protocol
              sanitized = sanitized.substring(firstIndex - 4);
            } else {
              break;
            }
          }

          // Try to parse as URL to validate
          new URL(sanitized);
          return sanitized;
        } catch (error) {
          console.error('Invalid URL:', url, error);
          throw new Error(`Invalid URL format: ${url}`);
        }
      };

      // Delete existing links for each type and insert new ones
      await Promise.all([
        // Update community links
        (async () => {
          // Delete existing community links
          await supabase
            .from('admin_social_links')
            .delete()
            .eq('link_type', 'community');

          // Insert new community links (filter out temp IDs)
          if (communityLinks.length > 0) {
            const { error } = await supabase
              .from('admin_social_links')
              .insert(
                communityLinks.map(link => ({
                  link_type: link.link_type,
                  label: link.label,
                  url: sanitizeUrl(link.url),
                  order: link.order,
                }))
              );

            if (error) {
              console.error('❌ Error inserting community links:', error);
              throw error;
            }
          }
        })(),

        // Update footer links
        (async () => {
          // Delete existing footer links
          await supabase
            .from('admin_social_links')
            .delete()
            .eq('link_type', 'footer');

          // Insert new footer links (filter out temp IDs)
          if (footerLinks.length > 0) {
            const { error } = await supabase
              .from('admin_social_links')
              .insert(
                footerLinks.map(link => ({
                  link_type: link.link_type,
                  label: link.label,
                  url: sanitizeUrl(link.url),
                  order: link.order,
                }))
              );

            if (error) {
              console.error('❌ Error inserting footer links:', error);
              throw error;
            }
          }
        })(),
      ]);

      // Fetch fresh data from database to update UI state
      await fetchSocialLinks();
      console.log('✅ Social links saved successfully');
    } catch (error) {
      console.error('❌ Failed to update social links:', error);
      setError('Failed to save social links');
      throw error;
    }
  };

  return (
    <AdminContext.Provider
      value={{
        adminSettings,
        loading,
        error,
        updateSettings,
        toggleMaintenanceMode,
        togglePricingEnabled,
        togglePropFirmLock,
        toggleJournalLock,
        togglePerformanceAnalyticsLock,
        addErrorLog,
        clearErrorLogs,
        updatePricingTiers,
        updateSocialLinks,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
};
