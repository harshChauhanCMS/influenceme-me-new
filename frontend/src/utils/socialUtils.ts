import type { ISocialFollowers } from '../../../shared/types/user';

/**
 * Normalize followers to a number for display.
 * API may return a number (legacy) or { actual, bought }.
 */
export function getFollowerCount(
  followers: number | ISocialFollowers | undefined
): number {
  if (followers == null) return 0;
  if (typeof followers === 'number') return followers;
  const actual = followers.actual ?? 0;
  const bought = followers.bought ?? 0;
  return actual + bought;
}
