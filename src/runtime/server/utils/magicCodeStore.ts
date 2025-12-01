import { randomInt } from 'node:crypto'
import { useStorage } from '#imports'
import { createLogger } from './logger'

const logger = createLogger('MagicCode')

export interface MagicCodeData {
  email: string
  type: 'register' | 'login' | 'reset'
  hashedPassword?: string
  attempts: number
  maxAttempts: number
  createdAt: number
  expiresAt: number
  [key: string]: unknown
}

/**
 * Generate a 6-digit magic code
 */
export function generateMagicCode(): string {
  return randomInt(100000, 999999).toString()
}

/**
 * Store a magic code
 */
export async function storeMagicCode(
  email: string,
  type: 'register' | 'login' | 'reset',
  data: Omit<MagicCodeData, 'attempts' | 'createdAt' | 'expiresAt' | 'email' | 'type'>,
  ttl = 600, // 10 minutes
  maxAttempts = 5,
): Promise<string> {
  const storage = useStorage()
  const normalizedEmail = email.toLowerCase()
  const code = generateMagicCode()
  const now = Date.now()

  // Check for existing code to prevent duplicates
  const lookupKey = `magic-lookup:${normalizedEmail}:${type}`
  const existingCode = await storage.getItem<string>(lookupKey)

  if (existingCode) {
    await storage.removeItem(`magic:${existingCode}`)
  }

  const magicCodeData: MagicCodeData = {
    ...data,
    email: normalizedEmail,
    type,
    attempts: 0,
    maxAttempts,
    createdAt: now,
    expiresAt: now + ttl * 1000,
  }

  await storage.setItem(`magic:${code}`, magicCodeData)
  await storage.setItem(lookupKey, code)

  logger.debug(`Magic code stored for ${normalizedEmail} (${type})`)

  return code
}

/**
 * Validate and increment attempts for a magic code
 */
export async function validateAndIncrementAttempts(code: string): Promise<MagicCodeData | null> {
  const storage = useStorage()
  const key = `magic:${code}`
  const data = await storage.getItem<MagicCodeData>(key)

  if (!data) {
    return null
  }

  if (Date.now() > data.expiresAt) {
    await storage.removeItem(key)
    const lookupKey = `magic-lookup:${data.email}:${data.type}`
    await storage.removeItem(lookupKey)
    return null
  }

  if (data.attempts >= data.maxAttempts) {
    await storage.removeItem(key)
    const lookupKey = `magic-lookup:${data.email}:${data.type}`
    await storage.removeItem(lookupKey)
    return null
  }

  data.attempts++
  await storage.setItem(key, data)

  return data
}

/**
 * Retrieve and delete a magic code
 */
export async function retrieveAndDeleteMagicCode(code: string): Promise<MagicCodeData | null> {
  const storage = useStorage()
  const key = `magic:${code}`
  const data = await storage.getItem<MagicCodeData>(key)

  if (!data) {
    return null
  }

  await storage.removeItem(key)
  const lookupKey = `magic-lookup:${data.email}:${data.type}`
  await storage.removeItem(lookupKey)

  return data
}
