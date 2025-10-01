# Pilr Agent Context

This file captures the current project state so the next agent can ramp up quickly.

## High-Level Purpose
- Pilr is a React + Vite PWA for pill reminders with partner escalation.
- Supabase provides auth, Postgres tables, and edge functions for scheduling and notifications.

## Current Schema Highlights (Supabase `public`)
- `users`: mirrors `auth.users`; stores `push_subscription` JSON.
- `pill_takers`: one row per pill taker with `reminder_time`, `timezone`, `active`.
- `partnerships`: links `pill_taker_id` to `partner_id`, tracks status/notification flag.
- `pill_tracking`: daily entries per user; `status` (`pending`/`taken`/`late`/`missed`), `partner_notified_at`.
- `notification_queue`: home-grown queue of reminders (`pill_primary`, `pill_follow_up`, `partner_alert`).
- `notification_log`: history of notification attempts.

## Edge Functions
- `daily-cleanup`: runs nightly. Marks previous pending/late pills as missed, creates today’s `pill_tracking` entries per active pill taker, seeds primary reminder into `notification_queue`. Uses Luxon for tz handling.
- `send-notifications`: cron-polled worker. Dequeues due items, sends push via WebPush + VAPID, logs attempts, schedules follow-up reminders and partner alerts, updates pill status.

## Frontend Architecture
- `AuthContext`: loads Supabase session, hydrates `users`, `pill_takers`, `partnerships`, computes `activeRole` (`pill_taker` or `partner`), tracks push subscription. Drives routing to `/role`, `/notifications`, `/home`, `/partner`.
- `RoleSelectionPage`: toggles `pill_takers.active` (creates row if needed) or deactivates when choosing partner role.
- `NotificationPermissionPage`: requests browser push, stores subscription in `users.push_subscription`.
- `HomePage`: pill taker dashboard. Reminder time edits upsert `pill_takers`. Hooks:
  - `useNotifications`: register SW (`/dev-sw.js?dev-sw` in dev, `/sw.js` prod), upsert subscription into `users`.
  - `usePillTracking`: CRUD on `pill_tracking`, marks taken (and cancels pending queue items).
  - `usePartnerManagement`: surfaces available partners (other `users` with subscriptions), maintains `partnerships`.
- `PartnerPage`: fetches active partnership and displays linked user’s pill state.
- `src/sw.js`: Workbox precache wrapper with guard for missing `__WB_MANIFEST` in dev.

## Recent Issues & Fixes
- Ensured frontend uses new tables (removed `user_preferences`/`user_partners`).
- Reworked edge functions for queue-driven notifications.
- Fixed dev service worker registration by guarding `__WB_MANIFEST` access.
- `pnpm build` passes.

## Open Items / Watchouts
- Regenerate `supabase/functions/send-notifications/deno.lock` to include Luxon.
- Add DB indexes for `notification_queue(processed_at, scheduled_for)` and `notification_log(pill_id)` to keep cron fast.
- Ensure Supabase enums include: `pill_status`, `notification_type`, `partner_status` with values used in code.
- Push to remote manually (network restricted earlier).

