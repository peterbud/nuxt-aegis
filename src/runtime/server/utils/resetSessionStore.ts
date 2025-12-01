import { randomBytes } from 'node:crypto'
import { useStorage } from '#imports'
import { createLogger } from './logger'

const logger = createLogger('ResetSession')

export interface ResetSessionData {
  email: string
  expiresAt: number
}

/**
 * Create a password reset session
 */
export async function createResetSession(email: string, ttl = 300): Promise<string> {
  const storage = useStorage()
  const sessionId = randomBytes(32).toString('base64url')
  const now = Date.now()

  const data: ResetSessionData = {
    email: email.toLowerCase(),
    expiresAt: now + ttl * 1000,
  }

  await storage.setItem(`reset:${sessionId}`, data)
  logger.debug(`Reset session created for ${email}`)

  return sessionId
}

/**
 * Validate and delete a password reset session
 */
export async function validateAndDeleteResetSession(sessionId: string): Promise<string | null> {
  const storage = useStorage()
  const key = `reset:${sessionId}`
  const data = await storage.getItem<ResetSessionData>(key)

  if (!data) {
    return null
  }

  await storage.removeItem(key)

  if (Date.now() > data.expiresAt) {
    return null
  }

  return data.email
}
