/**
 * Custom Claims Processing Utilities
 * Handles processing of custom claims from static values or callback functions
 */

import { createLogger } from './logger'

const logger = createLogger('CustomClaims')

/**
 * JT-11, JT-11a, JT-11b, JT-14, JT-15: Process custom claims configuration
 * Supports both static claim objects and callback functions (sync/async)
 * The same function is used for both initial authentication and token refresh
 *
 * @param providerUserInfo - Complete OAuth provider user data
 * @param customClaimsConfig - Custom claims configuration (static object or callback function)
 * @returns Processed custom claims object
 *
 * @example
 * // Static claims
 * const claims = await processCustomClaims(providerUserInfo, { role: 'admin', tier: 'premium' })
 *
 * @example
 * // Callback function
 * const claims = await processCustomClaims(providerUserInfo, async (providerUserInfo) => {
 *   const dbUser = await fetchUserFromDB(providerUserInfo.email)
 *   return { role: dbUser.role, permissions: dbUser.permissions }
 * })
 */
export async function processCustomClaims(
  providerUserInfo: Record<string, unknown>,
  customClaimsConfig?:
    | Record<string, unknown>
    | ((providerUserInfo: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>),
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
    const result = customClaimsConfig(providerUserInfo)

    // Handle both sync and async functions
    const claims = result instanceof Promise ? await result : result

    // Validate result is an object
    if (typeof claims !== 'object' || claims === null || Array.isArray(claims)) {
      logger.warn('Custom claims callback must return an object')
      return {}
    }

    return claims
  }
  catch (error) {
    logger.error('Error processing custom claims:', error)
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
      logger.warn(`Cannot override reserved JWT claim: ${key}`)
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
      logger.warn(`Custom claim "${key}" has unsupported type and will be ignored`)
    }
  })

  return validated
}
