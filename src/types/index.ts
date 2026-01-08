import { User } from '@supabase/supabase-js';
import { Tables, Enums } from './database.types';

// =============================================================================
// DATABASE TYPES (from generated types)
// =============================================================================

// Row types (what you get from SELECT)
export type UserRow = Tables<'users'>;
export type PillTrackingRow = Tables<'pill_tracking'>;
export type PartnershipRow = Tables<'partnerships'>;
export type NotificationLogRow = Tables<'notification_log'>;
export type InviteCodeRow = Tables<'invite_codes'>;

// Enum types
export type AppRole = Enums<'user_role'>;
export type PillStatus = Enums<'pill_status'>;
export type PartnerStatus = Enums<'partner_status'>;
export type NotificationType = Enums<'notification_type'>;

// =============================================================================
// BUSINESS TYPES (app-specific, not from DB)
// =============================================================================

// Push subscription data structure (stored in users.push_subscription JSONB)
export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Notification payload for push messages
export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: UserRow | null;
  partnerships: PartnershipRow[];
  activeRole: AppRole | null;
  hasPushSubscription: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
