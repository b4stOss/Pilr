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
// SUPABASE QUERY TYPES (for queries with relations)
// =============================================================================

/**
 * User fields commonly selected in partnership queries
 */
export type PartnerUserSelect = Pick<UserRow, 'id' | 'email' | 'push_subscription'>;

/**
 * Pill taker fields commonly selected in partnership queries
 */
export type PillTakerUserSelect = Pick<UserRow, 'id' | 'email' | 'first_name'>;

/**
 * Partnership with partner user data (for pill_taker viewing their partner)
 * Used in: usePartnerManagement hook
 */
export interface PartnershipWithPartner {
  partner_id: string;
  status: PartnerStatus | null;
  users: PartnerUserSelect;
}

/**
 * Partnership with pill_taker user data (for partner viewing their pill_taker)
 * Used in: PartnerPage
 */
export interface PartnershipWithPillTaker {
  pill_taker_id: string;
  status: PartnerStatus | null;
  users: PillTakerUserSelect;
}

// =============================================================================
// UI STATE TYPES
// =============================================================================

/**
 * Aggregated pill status for a day (includes 'no_pills' for empty days)
 */
export type AggregatedPillStatus = PillStatus | 'no_pills';

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

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  profileLoaded: boolean;
  profile: UserRow | null;
  partnerships: PartnershipRow[];
  activeRole: AppRole | null;
  hasPushSubscription: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
