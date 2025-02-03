// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { UserPreference, AuthContextType, PushSubscriptionData } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPreferences, setUserPreferences] = useState<UserPreference | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadUserSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user ?? null);

        if (session?.user) {
          const { data: preferences } = await supabase.from('user_preferences').select('*').eq('user_id', session.user.id).single();

          setUserPreferences(preferences);
          // Handle navigation based on user state and notification permission
          if (!preferences?.role) {
            navigate('/role');
          } else if (!preferences?.subscription || Notification.permission !== 'granted') {
            // Only redirect to notification page if we don't have subscription and permissions
            navigate('/notifications');
          } else {
            navigate(preferences.role === 'partner' ? '/partner' : '/home');
          }
        }
      } catch (error) {
        console.error('Error loading user session:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUserSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
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

  const updateUserReminderTime = async (userId: string, reminderTime: string, subscription: PushSubscriptionData): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          reminder_time: reminderTime,
          subscription: JSON.stringify(subscription),
        })
        .select();

      return !error;
    } catch (error) {
      console.error('Error updating reminder time:', error);
      return false;
    }
  };

  const contextValue: AuthContextType = {
    user,
    loading,
    userPreferences,
    signInWithGoogle,
    signOut,
    updateUserReminderTime,
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
