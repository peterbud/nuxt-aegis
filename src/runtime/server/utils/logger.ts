import { consola } from 'consola'
import { useRuntimeConfig } from '#imports'

/**
 * Logger instance for consistent logging across server-side code
 */
export interface Logger {
  debug: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
  security: (message: string, ...args: unknown[]) => void
}

/**
 * Create a logger instance with a specific context
 * Respects the logging configuration from runtime config
 *
 * @param context - Context identifier for log messages (e.g., 'Auth', 'JWT', 'OAuth')
 * @returns Logger instance with debug, info, warn, error, and security methods
 */
export function createLogger(context: string): Logger {
  const prefix = `[Nuxt Aegis][${context}]`

  return {
    debug: (message: string, ...args: unknown[]) => {
      const config = useRuntimeConfig()
      const loggingConfig = config.nuxtAegis?.logging
      const level = loggingConfig?.level || 'info'

      if (level === 'debug') {
        consola.debug(prefix, message, ...args)
      }
    },

    info: (message: string, ...args: unknown[]) => {
      const config = useRuntimeConfig()
      const loggingConfig = config.nuxtAegis?.logging
      const level = loggingConfig?.level || 'info'

      if (level !== 'silent' && level !== 'error' && level !== 'warn') {
        consola.info(prefix, message, ...args)
      }
    },

    warn: (message: string, ...args: unknown[]) => {
      const config = useRuntimeConfig()
      const loggingConfig = config.nuxtAegis?.logging
      const level = loggingConfig?.level || 'info'

      if (level !== 'silent' && level !== 'error') {
        consola.warn(prefix, message, ...args)
      }
    },

    error: (message: string, ...args: unknown[]) => {
      const config = useRuntimeConfig()
      const loggingConfig = config.nuxtAegis?.logging
      const level = loggingConfig?.level || 'info'

      if (level !== 'silent') {
        consola.error(prefix, message, ...args)
      }
    },

    security: (message: string, ...args: unknown[]) => {
      const config = useRuntimeConfig()
      const loggingConfig = config.nuxtAegis?.logging
      const level = loggingConfig?.level || 'info'

      // Security logs require explicit enablement OR debug level
      const securityEnabled = loggingConfig?.security === true || level === 'debug'

      // Also respect log level (don't show if silent)
      if (securityEnabled && level !== 'silent') {
        consola.warn(`[Nuxt Aegis Security][${context}]`, message, ...args)
      }
    },
  }
}
