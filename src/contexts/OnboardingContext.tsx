import { createContext, useCallback, useContext, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppRole, PushSubscriptionData } from '../types';
import { showErrorNotification } from '../utils';

interface OnboardingData {
  role: AppRole | null;
  reminderTime: string | null;
}

interface OnboardingContextType {
  data: OnboardingData;
  setRole: (role: AppRole) => void;
  setReminderTime: (time: string) => void;
  completeOnboarding: (userId: string, pushSubscription: PushSubscriptionData | null) => Promise<boolean>;
  resetOnboarding: () => void;
  isOnboarding: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const initialData: OnboardingData = {
  role: null,
  reminderTime: null,
};

/**
 * Validates time format: HH:mm with 15-minute intervals (for cron sync)
 */
function isValidReminderTime(time: string): boolean {
  if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    return false;
  }
  const minutes = parseInt(time.split(':')[1]);
  return minutes % 15 === 0;
}

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [data, setData] = useState<OnboardingData>(initialData);
  const [isOnboarding, setIsOnboarding] = useState(false);

  const setRole = useCallback((role: AppRole) => {
    setData((prev) => ({ ...prev, role }));
    setIsOnboarding(true);
  }, []);

  const setReminderTime = useCallback((time: string) => {
    setData((prev) => ({ ...prev, reminderTime: time }));
  }, []);

  const resetOnboarding = useCallback(() => {
    setData(initialData);
    setIsOnboarding(false);
  }, []);

  const completeOnboarding = useCallback(
    async (userId: string, pushSubscription: PushSubscriptionData | null): Promise<boolean> => {
      if (!data.role) {
        showErrorNotification('Please select a role first.');
        return false;
      }

      if (data.role === 'pill_taker') {
        if (!data.reminderTime) {
          showErrorNotification('Please set a reminder time first.');
          return false;
        }
        if (!isValidReminderTime(data.reminderTime)) {
          showErrorNotification('Reminder time must be in 15-minute intervals (e.g., 09:00, 09:15, 09:30, 09:45).');
          return false;
        }
      }

      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

        const updatePayload: Record<string, unknown> = {
          role: data.role,
          timezone,
          active: true,
          push_subscription: pushSubscription,
        };

        // Only include reminder_time for pill_takers
        if (data.role === 'pill_taker') {
          updatePayload.reminder_time = data.reminderTime;
        }

        const { error: updateError } = await supabase
          .from('users')
          .update(updatePayload)
          .eq('id', userId);

        if (updateError) throw updateError;

        // Reset onboarding state after successful completion
        resetOnboarding();
        return true;
      } catch (error) {
        console.error('Failed to complete onboarding:', error);
        showErrorNotification('Failed to save your preferences. Please try again.');
        return false;
      }
    },
    [data, resetOnboarding]
  );

  const contextValue: OnboardingContextType = {
    data,
    setRole,
    setReminderTime,
    completeOnboarding,
    resetOnboarding,
    isOnboarding,
  };

  return <OnboardingContext.Provider value={contextValue}>{children}</OnboardingContext.Provider>;
}

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
