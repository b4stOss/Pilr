import { User } from "@supabase/supabase-js";

// User roles
export type UserRole = 'user' | 'partner';

// Base notification subscription type
export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// User preferences with strict typing
export interface UserPreference {
  user_id: string;
  email: string | null;
  reminder_time: string | null; // Format: "HH:MM" in UTC
  role: UserRole | null;
  subscription: PushSubscriptionData | null;
  created_at?: string;
  updated_at?: string;
}

// Pill tracking with all possible states
export type PillStatus = 'pending' | 'taken' | 'missed';

export interface PillTracking {
  id: string;
  user_id: string;
  scheduled_time: string; // ISO string
  status: PillStatus;
  notification_count: number;
  next_notification_time: string; // ISO string
  taken_at: string | null;
  created_at: string;
}

// Partner relationship
export interface UserPartner {
  id: string;
  user_id: string;
  partner_id: string;
  status: 'active' | 'inactive' | 'pending';
  notification_enabled: boolean;
  created_at: string;
  updated_at: string | null;
}

// Notification payload type
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

// Auth context type
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  userPreferences: UserPreference | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserReminderTime: (userId: string, reminderTime: string, subscription: PushSubscriptionData) => Promise<boolean>;
}