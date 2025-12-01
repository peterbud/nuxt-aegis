import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

/**
 * Normalize email address
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Validate email format
 */
export function validateEmailFormat(email: string): { valid: boolean, error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' }
  }
  return { valid: true }
}

/**
 * Hash a password using scrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(':')
  if (!salt || !key) return false

  const keyBuffer = Buffer.from(key, 'hex')
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer
  return timingSafeEqual(keyBuffer, derivedKey)
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(
  password: string,
  policy: {
    minLength?: number
    requireUppercase?: boolean
    requireLowercase?: boolean
    requireNumber?: boolean
    requireSpecial?: boolean
  } = {},
): boolean | string[] {
  const errors: string[] = []
  const minLength = policy.minLength ?? 8

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`)
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (policy.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  if (policy.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return errors.length === 0 ? true : errors
}

/**
 * Obfuscate magic code for logging
 */
export function obfuscateMagicCode(code: string): string {
  return code.slice(-2).padStart(code.length, '*')
}
