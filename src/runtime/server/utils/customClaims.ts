/**
 * Custom Claims Processing Utilities
 * Handles processing of custom claims from static values or callback functions
 */

import { consola } from 'consola'

/**
 * JT-11, JT-11a, JT-11b, JT-14, JT-15: Process custom claims configuration
 * Supports both static claim objects and callback functions (sync/async)
 * The same function is used for both initial authentication and token refresh
 *
 * @param user - Complete user object from the authentication provider
 * @param customClaimsConfig - Custom claims configuration (static object or callback function)
 * @returns Processed custom claims object
 *
 * @example
 * // Static claims
 * const claims = await processCustomClaims(user, { role: 'admin', tier: 'premium' })
 *
 * @example
 * // Callback function
 * const claims = await processCustomClaims(user, async (user) => {
 *   const dbUser = await fetchUserFromDB(user.email)
 *   return { role: dbUser.role, permissions: dbUser.permissions }
 * })
 */
export async function processCustomClaims(
  user: Record<string, unknown>,
  customClaimsConfig?:
    | Record<string, unknown>
    | ((user: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>),
): Promise<Record<string, unknown>> {
  if (!customClaimsConfig) {
    return {}
  }

  // JT-11: Handle static claims (plain object)
  if (typeof customClaimsConfig !== 'function') {
    return customClaimsConfig
  }

  // JT-11a, JT-11b: Handle callback function (sync or async)
  try {
    const result = customClaimsConfig(user)

    // Handle both sync and async functions
    const claims = result instanceof Promise ? await result : result

    // Validate result is an object
    if (typeof claims !== 'object' || claims === null || Array.isArray(claims)) {
      consola.warn('[Nuxt Aegis] Custom claims callback must return an object')
      return {}
    }

    return claims
  }
  catch (error) {
    consola.error('[Nuxt Aegis] Error processing custom claims:', error)
    return {}
  }
}

/**
 * JT-12: Validate that custom claims don't override reserved JWT claims
 * @param claims - Custom claims to validate
 * @returns Filtered claims with reserved claims removed
 */
export function filterReservedClaims(claims: Record<string, unknown>): Record<string, unknown> {
  const reservedClaims = ['iss', 'sub', 'exp', 'iat', 'nbf', 'jti', 'aud']
  const filtered: Record<string, unknown> = {}

  Object.entries(claims).forEach(([key, value]) => {
    if (reservedClaims.includes(key)) {
      consola.warn(`[Nuxt Aegis] Cannot override reserved JWT claim: ${key}`)
    }
    else {
      filtered[key] = value
    }
  })

  return filtered
}

/**
 * JT-13: Validate that custom claim values are of supported types
 * @param claims - Custom claims to validate
 * @returns Filtered claims with only supported value types
 */
export function validateClaimTypes(claims: Record<string, unknown>): Record<string, unknown> {
  const validated: Record<string, unknown> = {}

  Object.entries(claims).forEach(([key, value]) => {
    // JT-13: Support primitive types (string, number, boolean) and arrays
    if (
      typeof value === 'string'
      || typeof value === 'number'
      || typeof value === 'boolean'
      || Array.isArray(value)
      || value === null
    ) {
      validated[key] = value
    }
    else {
      consola.warn(`[Nuxt Aegis] Custom claim "${key}" has unsupported type and will be ignored`)
    }
  })

  return validated
}
