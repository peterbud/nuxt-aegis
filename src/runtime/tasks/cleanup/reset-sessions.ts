import { defineTask, useStorage } from 'nitropack/runtime'
import type { ResetSessionData } from '../../server/utils/resetSessionStore'
import { createLogger } from '../../server/utils/logger'

const logger = createLogger('Task:CleanupResetSessions')

export default defineTask({
  meta: {
    name: 'cleanup:reset-sessions',
    description: 'Clean up expired password reset sessions',
  },
  async run() {
    logger.info('Starting reset session cleanup task...')

    const storage = useStorage()
    const allKeys = await storage.getKeys()
    const resetKeys = allKeys.filter((key: string) => key.startsWith('reset:'))
    const now = Date.now()

    let deletedCount = 0
    let errorCount = 0
    let skippedCount = 0

    for (const key of resetKeys) {
      try {
        const data = await storage.getItem<ResetSessionData>(key)

        if (!data) {
          // Data doesn't exist
          skippedCount++
          continue
        }

        // Check if reset session is expired
        if (data.expiresAt < now) {
          await storage.removeItem(key)
          deletedCount++
          logger.debug(`Deleted expired reset session for ${data.email}`)
        }
      }
      catch (error) {
        errorCount++
        logger.error(`Error processing reset session ${key}:`, error)
      }
    }

    const result = {
      totalProcessed: resetKeys.length,
      deleted: deletedCount,
      skipped: skippedCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
    }

    logger.info(`Reset session cleanup completed: ${deletedCount} deleted, ${skippedCount} skipped, ${errorCount} errors`)

    return { result }
  },
})
