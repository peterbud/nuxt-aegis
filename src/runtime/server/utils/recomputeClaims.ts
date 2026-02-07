import type { H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { RefreshTokenData, TokenRefreshConfig } from '../../types'
import { useAegisHandler, type UserPersistContext } from './handler'
import { processCustomClaims } from './customClaims'
import { createLogger } from './logger'

const logger = createLogger('RecomputeClaims')

/**
 * Recompute custom claims for a user based on current data
 *
 * Uses the global handler's customClaims callback to generate fresh claims.
 * Optionally re-executes onUserPersist to fetch fresh database data.
 *
 * @param refreshTokenData - Stored refresh token data containing user info
 * @param event - H3 event for context
 * @returns Updated custom claims object
 *
 * @example
 * ```typescript
 * const storedData = await getRefreshTokenData(hashedToken, event)
 * const newClaims = await recomputeCustomClaims(storedData, event)
 * // newClaims now contains fresh data from database
 * ```
 */
export async function recomputeCustomClaims(
  refreshTokenData: RefreshTokenData,
  event: H3Event,
): Promise<Record<string, unknown>> {
  const config = useRuntimeConfig(event)
  const tokenRefreshConfig = config.nuxtAegis?.tokenRefresh as TokenRefreshConfig

  // Get global handler
  const handler = useAegisHandler()

  if (!handler) {
    logger.warn('No Aegis handler registered. Cannot recompute custom claims.')
    // Return existing claims if no handler is registered
    return refreshTokenData.customClaims || {}
  }

  let userData = refreshTokenData.providerUserInfo
  const provider = refreshTokenData.provider

  // Optionally re-execute onUserPersist to get fresh database data
  if (tokenRefreshConfig?.recomputeOnUserPersist && handler.onUserPersist) {
    logger.debug(`Re-executing onUserPersist for provider: ${provider}`)

    const persistContext: UserPersistContext = {
      provider,
      event,
    }

    try {
      const enrichedData = await handler.onUserPersist(userData, persistContext)
      // Merge enriched data with provider user info
      if (enrichedData) {
        userData = {
          ...userData,
          ...enrichedData,
        }
      }
    }
    catch (error) {
      logger.error('Error re-executing onUserPersist:', error)
      // Continue with original userData on error
    }
  }

  // Execute customClaims callback to generate fresh claims
  if (!handler.customClaims) {
    logger.debug('No customClaims callback defined in handler. Returning existing claims.')
    return refreshTokenData.customClaims || {}
  }

  try {
    logger.debug(`Recomputing custom claims for user: ${refreshTokenData.sub}`)

    // Process custom claims through the standard processing pipeline
    const newClaims = await processCustomClaims(
      userData,
      handler.customClaims,
    )

    logger.debug('Custom claims recomputed successfully')
    return newClaims
  }
  catch (error) {
    logger.error('Error recomputing custom claims:', error)
    // Return existing claims on error to avoid breaking the session
    return refreshTokenData.customClaims || {}
  }
}
