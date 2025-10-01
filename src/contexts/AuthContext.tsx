// src/contexts/AuthContext.tsx
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContextType, PillTakerProfile, Partnership, UserProfile, AppRole } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pillTakerProfile, setPillTakerProfile] = useState<PillTakerProfile | null>(null);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
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
    }
  }, []);

  const fetchProfile = useCallback(
    async (userId: string) => {
      try {
        const { data: userData, error: userError } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
        if (userError) throw userError;
        setProfile(userData ?? null);
        setHasPushSubscription(Boolean(userData?.push_subscription));

        const { data: pillData, error: pillError } = await supabase.from('pill_takers').select('*').eq('user_id', userId).maybeSingle();
        if (pillError && pillError.code !== 'PGRST116') throw pillError;
        const activePillTaker = pillData && pillData.active !== false ? (pillData as PillTakerProfile) : null;
        setPillTakerProfile(activePillTaker);

        const { data: partnershipsData, error: partnershipsError } = await supabase
          .from('partnerships')
          .select('*')
          .or(`pill_taker_id.eq.${userId},partner_id.eq.${userId}`);

        if (partnershipsError) throw partnershipsError;
        setPartnerships(partnershipsData ?? []);

        const computedRole: AppRole | null = activePillTaker
          ? 'pill_taker'
          : (partnershipsData ?? []).some((p) => p.partner_id === userId && p.status === 'active')
            ? 'partner'
            : null;

        setActiveRole(computedRole);
      } catch (error) {
        console.error('Error loading profile data:', error);
      }
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadUserSession() {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!isMounted) return;

        setUser(session?.user ?? null);

        if (session?.user) {
          await ensureUserRow(session.user);
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setPillTakerProfile(null);
          setPartnerships([]);
          setActiveRole(null);
          setHasPushSubscription(false);
        }
      } catch (error) {
        console.error('Error loading user session:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadUserSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        setUser(session.user);
        setLoading(true);
        await ensureUserRow(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setPillTakerProfile(null);
        setPartnerships([]);
        setActiveRole(null);
        setHasPushSubscription(false);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [ensureUserRow, fetchProfile]);

  useEffect(() => {
    if (loading || !user) return;

    const currentPath = location.pathname;
    const permissionGranted =
      typeof Notification !== 'undefined' ? Notification.permission === 'granted' : false;

    if (!activeRole) {
      if (currentPath !== '/role') {
        navigate('/role', { replace: true });
      }
      return;
    }

    if ((!hasPushSubscription || !permissionGranted) && currentPath !== '/notifications') {
      navigate('/notifications', { replace: true });
      return;
    }

    if (activeRole === 'partner') {
      if (currentPath !== '/partner' && currentPath !== '/notifications') {
        navigate('/partner', { replace: true });
      }
      return;
    }

    if (activeRole === 'pill_taker' && currentPath !== '/home' && currentPath !== '/notifications') {
      navigate('/home', { replace: true });
    }
  }, [activeRole, hasPushSubscription, loading, navigate, location.pathname, user]);

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
    setLoading(true);
    await fetchProfile(user.id);
    setLoading(false);
  }, [fetchProfile, user]);

  const contextValue: AuthContextType = {
    user,
    loading,
    profile,
    pillTakerProfile,
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
