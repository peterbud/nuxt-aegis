import { defineTask, useStorage } from 'nitropack/runtime'
import { getRefreshTokenData } from '../../server/utils/refreshToken'
import { createLogger } from '../../server/utils/logger'

const logger = createLogger('Task:CleanupRefreshTokens')

export default defineTask({
  meta: {
    name: 'cleanup:refresh-tokens',
    description: 'Clean up expired and revoked refresh tokens from storage',
  },
  async run() {
    logger.info('Starting refresh token cleanup task...')

    const storage = useStorage('refreshTokenStore')
    const keys = await storage.getKeys()
    const now = Date.now()

    let deletedCount = 0
    let revokedCount = 0
    let expiredCount = 0
    let errorCount = 0
    let skippedCount = 0

    for (const tokenHash of keys) {
      try {
        const data = await getRefreshTokenData(tokenHash)

        if (!data) {
          // Data doesn't exist or couldn't be decrypted
          skippedCount++
          continue
        }

        // Check if token is expired or revoked
        if (data.expiresAt < now || data.isRevoked) {
          await storage.removeItem(tokenHash)
          deletedCount++

          if (data.isRevoked) {
            revokedCount++
            logger.debug(`Deleted revoked refresh token: ${tokenHash.substring(0, 8)}...`)
          }
          else {
            expiredCount++
            logger.debug(`Deleted expired refresh token: ${tokenHash.substring(0, 8)}...`)
          }
        }
      }
      catch (error) {
        errorCount++
        logger.error(`Error processing token ${tokenHash.substring(0, 8)}...:`, error)
      }
    }

    const result = {
      totalProcessed: keys.length,
      deleted: deletedCount,
      expired: expiredCount,
      revoked: revokedCount,
      skipped: skippedCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
    }

    logger.info(`Refresh token cleanup completed: ${deletedCount} deleted (${expiredCount} expired, ${revokedCount} revoked), ${skippedCount} skipped, ${errorCount} errors`)

    return { result }
  },
})
