import { defineTask, useStorage } from 'nitropack/runtime'
import type { MagicCodeData } from '../../server/utils/magicCodeStore'
import { createLogger } from '../../server/utils/logger'

const logger = createLogger('Task:CleanupMagicCodes')

export default defineTask({
  meta: {
    name: 'cleanup:magic-codes',
    description: 'Clean up expired magic codes and their lookup keys',
  },
  async run() {
    logger.info('Starting magic code cleanup task...')

    const storage = useStorage()
    const now = Date.now()

    // Get all magic code keys
    const allKeys = await storage.getKeys()
    const magicCodeKeys = allKeys.filter((key: string) => key.startsWith('magic:'))
    const lookupKeys = allKeys.filter((key: string) => key.startsWith('magic-lookup:'))

    let deletedCount = 0
    let errorCount = 0
    let skippedCount = 0
    const deletedLookupKeys = new Set<string>()

    // Process magic codes
    for (const key of magicCodeKeys) {
      try {
        const data = await storage.getItem<MagicCodeData>(key)

        if (!data) {
          // Data doesn't exist
          skippedCount++
          continue
        }

        // Check if magic code is expired
        if (data.expiresAt < now) {
          await storage.removeItem(key)
          deletedCount++

          // Mark lookup key for deletion
          const lookupKey = `magic-lookup:${data.email}:${data.type}`
          deletedLookupKeys.add(lookupKey)

          logger.debug(`Deleted expired magic code for ${data.email} (${data.type})`)
        }
      }
      catch (error) {
        errorCount++
        logger.error(`Error processing magic code ${key}:`, error)
      }
    }

    // Clean up corresponding lookup keys
    let lookupDeletedCount = 0
    for (const lookupKey of deletedLookupKeys) {
      try {
        await storage.removeItem(lookupKey)
        lookupDeletedCount++
      }
      catch (error) {
        errorCount++
        logger.error(`Error deleting lookup key ${lookupKey}:`, error)
      }
    }

    // Clean up orphaned lookup keys (lookup keys pointing to non-existent codes)
    let orphanedCount = 0
    for (const lookupKey of lookupKeys) {
      try {
        const code = await storage.getItem<string>(lookupKey)
        if (code) {
          const magicCodeKey = `magic:${code}`
          const exists = await storage.getItem(magicCodeKey)
          if (!exists) {
            await storage.removeItem(lookupKey)
            orphanedCount++
            logger.debug(`Deleted orphaned lookup key: ${lookupKey}`)
          }
        }
      }
      catch (error) {
        errorCount++
        logger.error(`Error processing lookup key ${lookupKey}:`, error)
      }
    }

    const result = {
      totalProcessed: magicCodeKeys.length,
      deleted: deletedCount,
      lookupKeysDeleted: lookupDeletedCount,
      orphanedKeysDeleted: orphanedCount,
      skipped: skippedCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
    }

    logger.info(`Magic code cleanup completed: ${deletedCount} codes deleted, ${lookupDeletedCount} lookup keys deleted, ${orphanedCount} orphaned keys deleted, ${skippedCount} skipped, ${errorCount} errors`)

    return { result }
  },
})
