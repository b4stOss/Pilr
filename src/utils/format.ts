import { DateTime } from 'luxon';

/**
 * Extract display name from user data
 * Priority: firstName > email username > fallback
 */
export function getDisplayName(
  user: { firstName?: string | null; first_name?: string | null; email?: string | null } | null,
  fallback = 'User'
): string {
  if (!user) return fallback;

  // Check firstName (camelCase) or first_name (snake_case from DB)
  const firstName = user.firstName ?? user.first_name;
  if (firstName) return firstName;

  // Fallback to email username
  if (user.email) {
    const name = user.email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  return fallback;
}

/**
 * Format time remaining until expiration
 */
export function formatTimeRemaining(expiresAt: string): string {
  const now = DateTime.now();
  const expires = DateTime.fromISO(expiresAt);
  const diff = expires.diff(now, ['hours', 'minutes']);

  const hours = Math.floor(diff.hours);
  const minutes = Math.floor(diff.minutes);

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}
