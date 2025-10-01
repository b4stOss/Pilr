import { User } from '@supabase/supabase-js';

// Base notification subscription type
export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Normalised user profile (mirrors public.users)
export interface UserProfile {
  id: string;
  email: string | null;
  push_subscription: PushSubscriptionData | null;
  created_at?: string;
  updated_at?: string;
}

// Pill taker specific data (public.pill_takers)
export interface PillTakerProfile {
  user_id: string;
  reminder_time: string; // HH:MM[:SS] from Postgres time column
  timezone: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Partner relationship (public.partnerships)
export type PartnerStatus = 'pending' | 'active' | 'inactive';

export interface Partnership {
  id: string;
  pill_taker_id: string;
  partner_id: string;
  status: PartnerStatus;
  notification_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

// Pill tracking entries (public.pill_tracking)
export type PillStatus = 'pending' | 'taken' | 'late' | 'missed';

export interface PillTracking {
  id: string;
  user_id: string;
  scheduled_time: string; // ISO string
  status: PillStatus;
  taken_at: string | null;
  partner_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

// Notification queue + log (public.notification_queue, public.notification_log)
export type NotificationType = 'pill_primary' | 'pill_follow_up' | 'partner_alert';

export interface NotificationQueueItem {
  id: string;
  pill_id: string;
  notification_type: NotificationType;
  recipient_id: string;
  scheduled_for: string;
  attempt_number: number;
  processed_at: string | null;
  success: boolean | null;
  error_message: string | null;
  created_at: string;
}

export interface NotificationLogEntry {
  id: string;
  pill_id: string;
  recipient_id: string;
  notification_type: NotificationType;
  attempt_number: number;
  sent_at: string;
  success: boolean;
  error_message: string | null;
}

// Notification payload type for push
export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

// API response types
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

export type AppRole = 'pill_taker' | 'partner';

// Auth context type
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: UserProfile | null;
  pillTakerProfile: PillTakerProfile | null;
  partnerships: Partnership[];
  activeRole: AppRole | null;
  hasPushSubscription: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
