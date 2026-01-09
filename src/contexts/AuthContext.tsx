// src/contexts/AuthContext.tsx
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContextType, PartnershipRow, UserRow, AppRole } from '../types';
import { showErrorNotification } from '../utils';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profile, setProfile] = useState<UserRow | null>(null);
  const [partnerships, setPartnerships] = useState<PartnershipRow[]>([]);
  const [activeRole, setActiveRole] = useState<AppRole | null>(null);
  const [hasPushSubscription, setHasPushSubscription] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const ensureUserRow = useCallback(async (authUser: User) => {
    try {
      await supabase.from('users').upsert({
        id: authUser.id,
        email: authUser.email,
      });
    } catch (error) {
      console.error('Failed to upsert user profile:', error);
      showErrorNotification('Failed to initialize your profile. Please refresh the page.');
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      // Single query on unified users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (userError) throw userError;

      setProfile(userData);
      setHasPushSubscription(Boolean(userData?.push_subscription));

      // Fetch partnerships
      const { data: partnershipsData, error: partnershipsError } = await supabase
        .from('partnerships')
        .select('*')
        .or(`pill_taker_id.eq.${userId},partner_id.eq.${userId}`);

      if (partnershipsError) throw partnershipsError;
      setPartnerships(partnershipsData ?? []);

      // Determine active role from unified profile
      let computedRole: AppRole | null = null;

      if (userData?.role === 'pill_taker' && userData.active) {
        computedRole = 'pill_taker';
      } else if (userData?.role === 'partner') {
        computedRole = 'partner';
      }

      setActiveRole(computedRole);
      setProfileLoaded(true);
    } catch (error) {
      console.error('Error loading profile data:', error);
      showErrorNotification('Failed to load your profile. Please refresh the page.');
      setProfileLoaded(true); // Still mark as loaded to avoid infinite loading
    }
  }, []);

  // Auth state management - following Supabase best practices
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        // Handle initial session on page load
        if (session?.user) {
          setUser(session.user);
          // Load profile in a separate effect to avoid async in callback
        } else {
          setUser(null);
        }
        setLoading(false);
      } else if (event === 'SIGNED_IN') {
        setUser(session?.user ?? null);
        setProfileLoaded(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setPartnerships([]);
        setActiveRole(null);
        setHasPushSubscription(false);
        setProfileLoaded(false);
      } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // Update user but don't reload profile
        if (session?.user) {
          setUser(session.user);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load profile when user changes
  useEffect(() => {
    if (!user) {
      setProfileLoaded(true); // No user = nothing to load
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        await ensureUserRow(user);
        if (!cancelled) {
          await fetchProfile(user.id);
        }
      } catch (error) {
        console.error('[Auth] Error loading profile:', error);
      } finally {
        if (!cancelled) {
          setProfileLoaded(true);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user, ensureUserRow, fetchProfile]);

  useEffect(() => {
    // Wait for both auth and profile to be loaded
    if (loading || !profileLoaded || !user) return;

    const currentPath = location.pathname;

    // Onboarding pages - let them manage their own navigation
    const onboardingPages = ['/role', '/setup-reminder', '/notifications'];
    const isOnOnboardingPage = onboardingPages.includes(currentPath);

    // If user hasn't completed onboarding (no role in DB)
    if (!activeRole) {
      // Redirect to /role if not already on an onboarding page
      if (!isOnOnboardingPage) {
        navigate('/role', { replace: true });
      }
      // Let onboarding pages handle their own logic
      return;
    }

    // User has completed onboarding - apply post-onboarding routing

    // Allow access to onboarding pages (for potential settings changes later)
    if (isOnOnboardingPage) {
      return;
    }

    // Navigate to appropriate home page based on role
    if (activeRole === 'partner') {
      if (currentPath !== '/partner' && currentPath !== '/enter-code') {
        navigate('/partner', { replace: true });
      }
      return;
    }

    if (activeRole === 'pill_taker' && currentPath !== '/home') {
      navigate('/home', { replace: true });
    }
  }, [activeRole, profileLoaded, loading, navigate, location.pathname, user]);

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = `${window.location.origin}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await fetchProfile(user.id);
  }, [fetchProfile, user]);

  const contextValue: AuthContextType = {
    user,
    loading,
    profile,
    partnerships,
    activeRole,
    hasPushSubscription,
    signInWithGoogle,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
