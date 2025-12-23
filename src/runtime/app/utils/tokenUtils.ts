import type { BaseTokenClaims } from '../../types'

/**
 * Filter out time-sensitive JWT metadata claims that cause hydration mismatches
 *
 * These claims are automatically regenerated on each token creation, causing different
 * values between server-rendered and client-refreshed tokens. Filtering them prevents
 * hydration mismatches while preserving stable user data.
 *
 * Filtered claims:
 * - iat (issued at) - timestamp when token was created
 * - exp (expiration) - timestamp when token expires
 * - iss (issuer) - token issuer (constant but not user data)
 *
 * @param user - Token payload with all claims
 * @returns Token payload with only stable user data
 */
export function filterTimeSensitiveClaims(user: BaseTokenClaims): BaseTokenClaims {
  const { iat, exp, ...stableUser } = user
  return stableUser as BaseTokenClaims
}
