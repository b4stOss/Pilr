-- Migration: Initial schema (clean start)
-- This migration creates the simplified schema for the Pilr app
--
-- Tables:
--   - users: All user data (pill_takers + partners unified)
--   - partnerships: 1-1 link between pill_taker and partner
--   - pill_tracking: Daily pill entries
--   - notification_log: Audit trail for sent notifications

-- ============================================================================
-- ENUMS
-- ============================================================================

-- User role
CREATE TYPE user_role AS ENUM ('pill_taker', 'partner');

-- Partnership status
CREATE TYPE partner_status AS ENUM ('pending', 'active');

-- Pill status
CREATE TYPE pill_status AS ENUM ('pending', 'taken', 'late_taken', 'missed');

-- Notification type (for logging)
CREATE TYPE notification_type AS ENUM ('user_reminder', 'partner_alert');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table: unified user data (replaces separate users + pill_takers tables)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role user_role,

  -- Pill taker specific fields (NULL for partners)
  reminder_time TIME,
  timezone TEXT DEFAULT 'UTC',
  active BOOLEAN DEFAULT true,

  -- Push notification subscription (required to receive notifications)
  push_subscription JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Partnerships table: 1-1 relationship between pill_taker and partner
CREATE TABLE partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pill_taker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status partner_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints for 1-1 relationship
  CONSTRAINT unique_pill_taker UNIQUE (pill_taker_id),
  CONSTRAINT unique_partner UNIQUE (partner_id),
  CONSTRAINT no_self_partnership CHECK (pill_taker_id != partner_id)
);

-- Pill tracking table: daily pill entries
CREATE TABLE pill_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status pill_status DEFAULT 'pending',
  taken_at TIMESTAMPTZ,

  -- Notification tracking (to avoid duplicate sends)
  reminder_count INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  partner_alerted BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Notification log: audit trail for debugging
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pill_id UUID REFERENCES pill_tracking(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notification_type notification_type NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookup for pending pills to notify
CREATE INDEX idx_pill_tracking_pending
ON pill_tracking(user_id, scheduled_time)
WHERE status = 'pending';

-- Fast lookup for active pill takers
CREATE INDEX idx_users_active_pill_takers
ON users(reminder_time, timezone)
WHERE role = 'pill_taker' AND active = true;

-- Fast lookup for active partnerships
CREATE INDEX idx_partnerships_active
ON partnerships(pill_taker_id, partner_id)
WHERE status = 'active';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE pill_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Users: can read/update own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users: partners can read their linked pill_taker's basic info
CREATE POLICY "Partners can read linked pill_taker" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE partnerships.partner_id = auth.uid()
      AND partnerships.pill_taker_id = users.id
      AND partnerships.status = 'active'
    )
  );

-- Partnerships: users can read their own partnerships
CREATE POLICY "Users can read own partnerships" ON partnerships
  FOR SELECT USING (auth.uid() = pill_taker_id OR auth.uid() = partner_id);

-- Partnerships: pill_takers can manage their partnerships
CREATE POLICY "Pill takers can insert partnerships" ON partnerships
  FOR INSERT WITH CHECK (auth.uid() = pill_taker_id);

CREATE POLICY "Pill takers can update own partnerships" ON partnerships
  FOR UPDATE USING (auth.uid() = pill_taker_id);

CREATE POLICY "Pill takers can delete own partnerships" ON partnerships
  FOR DELETE USING (auth.uid() = pill_taker_id);

-- Pill tracking: users can manage their own pills
CREATE POLICY "Users can read own pills" ON pill_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own pills" ON pill_tracking
  FOR UPDATE USING (auth.uid() = user_id);

-- Pill tracking: partners can read their linked pill_taker's pills
CREATE POLICY "Partners can read linked pills" ON pill_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE partnerships.partner_id = auth.uid()
      AND partnerships.pill_taker_id = pill_tracking.user_id
      AND partnerships.status = 'active'
    )
  );

-- Notification log: users can read their own logs
CREATE POLICY "Users can read own notification logs" ON notification_log
  FOR SELECT USING (auth.uid() = recipient_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER pill_tracking_updated_at
  BEFORE UPDATE ON pill_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
