// src/contexts/AuthContext.tsx
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
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
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (userError) throw userError;

      setProfile(userData);
      setHasPushSubscription(Boolean(userData?.push_subscription));

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
    } catch (error) {
      console.error('Error loading profile data:', error);
      showErrorNotification('Failed to load your profile. Please refresh the page.');
    } finally {
      setProfileLoaded(true);
    }
  }, []);

  // Auth state management - following Supabase best practices
  // No async operations in callback, deferred to separate useEffect
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        setUser(session?.user ?? null);
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
        if (session?.user) {
          setUser(session.user);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load profile when user changes (deferred from onAuthStateChange)
  useEffect(() => {
    if (!user) {
      setProfileLoaded(true);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      await ensureUserRow(user);
      if (!cancelled) {
        await fetchProfile(user.id);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user, ensureUserRow, fetchProfile]);

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
      // Navigation handled by RouterGuard when user becomes null
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
    profileLoaded,
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
