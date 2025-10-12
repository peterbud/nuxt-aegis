import type { H3Error, H3Event } from 'h3'

/**
 * Callback and error handler type definitions
 */

/**
 * Error handler callback type
 */
export type OnError = (event: H3Event, error: H3Error) => Promise<void> | void
