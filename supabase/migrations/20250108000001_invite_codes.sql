-- Migration: Invite codes system for partner linking + first_name field

-- ============================================================================
-- ADD FIRST_NAME TO USERS
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;

-- ============================================================================
-- INVITE CODES TABLE
-- ============================================================================
-- This migration adds a secure invitation code system to replace the
-- insecure "list all users" approach for partner linking.
--
-- Flow:
--   1. Pill taker generates a 6-character code (valid 48h)
--   2. Partner enters the code to create a partnership
--   3. Code is marked as used and cannot be reused

-- ============================================================================
-- TABLE
-- ============================================================================

CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,
  pill_taker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookup by code (for validation)
CREATE INDEX idx_invite_codes_code ON invite_codes(code);

-- Fast lookup by pill_taker (to find their active code)
CREATE INDEX idx_invite_codes_pill_taker ON invite_codes(pill_taker_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Pill takers can manage their own codes (INSERT, DELETE)
CREATE POLICY "pill_takers_insert_codes" ON invite_codes
  FOR INSERT
  WITH CHECK (auth.uid() = pill_taker_id);

CREATE POLICY "pill_takers_delete_codes" ON invite_codes
  FOR DELETE
  USING (auth.uid() = pill_taker_id);

-- Any authenticated user can read codes
CREATE POLICY "authenticated_can_read_codes" ON invite_codes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Any authenticated user can mark a valid code as used
CREATE POLICY "authenticated_can_use_codes" ON invite_codes
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND expires_at > NOW()
    AND used_at IS NULL
  )
  WITH CHECK (
    used_by = auth.uid()
    AND used_at IS NOT NULL
  );

-- ============================================================================
-- PARTNERSHIPS: Allow partners to create partnerships via invite code
-- ============================================================================

CREATE POLICY "Partners can insert partnerships" ON partnerships
  FOR INSERT WITH CHECK (auth.uid() = partner_id);

-- ============================================================================
-- USERS: Allow pill_takers to read their linked partner's profile
-- ============================================================================

CREATE POLICY "Pill takers can read linked partner" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE partnerships.pill_taker_id = auth.uid()
      AND partnerships.partner_id = users.id
      AND partnerships.status = 'active'
    )
  );
