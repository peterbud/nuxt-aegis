import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export const OAUTH_TRANSACTION_TTL = 600_000
export const OAUTH_BROWSER_LIMIT = 8
const GENERATED_VALUE = /^[\w-]{43}$/

interface TransactionContext {
  provider: string
  clientId: string
  redirectUri: string
}

interface Transaction extends TransactionContext {
  proofHash: Buffer
  createdAt: number
  expiresAt: number
  redirectTo?: string
  applicationState?: string
}

export function isOAuthGeneratedValue(value: unknown): value is string {
  return typeof value === 'string' && GENERATED_VALUE.test(value)
    && Buffer.from(value, 'base64url').toString('base64url') === value
}

export function hasOAuthControlCharacters(value: string, includeSpace = false): boolean {
  return Array.from(value).some(character => character.charCodeAt(0) <= (includeSpace ? 32 : 31) || character.charCodeAt(0) === 127)
}

export function validateOAuthRedirect(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || hasOAuthControlCharacters(value, true)) {
    throw new Error('Invalid OAuth redirect destination')
  }
  let decoded: string
  try {
    decoded = decodeURIComponent(value)
  }
  catch {
    throw new Error('Invalid OAuth redirect destination')
  }
  if (decoded.startsWith('//') || decoded.includes('\\') || hasOAuthControlCharacters(decoded, true)) {
    throw new Error('Invalid OAuth redirect destination')
  }
  const origin = 'https://aegis.invalid'
  const destination = new URL(value, origin)
  if (destination.origin !== origin || destination.pathname.startsWith('//')
    || new URL(decoded, origin).pathname.startsWith('//')) {
    throw new Error('Invalid OAuth redirect destination')
  }
  return value
}

export function createOAuthTransactionStore(capacity = 10_000) {
  const transactions = new Map<string, Transaction>()

  function prune(now: number) {
    for (const [state, transaction] of transactions) {
      if (transaction.expiresAt <= now) transactions.delete(state)
    }
  }

  return {
    create(context: TransactionContext, metadata: { redirectTo?: string, applicationState?: string } = {}, limit = capacity) {
      const now = Date.now()
      prune(now)
      if (!Number.isSafeInteger(limit) || limit < 1 || transactions.size >= limit) throw new Error('OAuth login unavailable')
      const redirectTo = metadata.redirectTo === undefined ? undefined : validateOAuthRedirect(metadata.redirectTo)
      const state = randomBytes(32).toString('base64url')
      const proof = randomBytes(32).toString('base64url')
      const expiresAt = now + OAUTH_TRANSACTION_TTL
      transactions.set(state, {
        ...context,
        ...metadata,
        redirectTo,
        proofHash: createHash('sha256').update(proof).digest(),
        createdAt: now,
        expiresAt,
      })
      return { state, proof, expiresAt }
    },
    consume(state: string, proof: string, context: TransactionContext) {
      if (!isOAuthGeneratedValue(state) || !isOAuthGeneratedValue(proof)) return undefined
      const transaction = transactions.get(state)
      if (!transaction) return undefined
      if (transaction.expiresAt <= Date.now()) {
        transactions.delete(state)
        return undefined
      }
      if (transaction.provider !== context.provider || transaction.clientId !== context.clientId
        || transaction.redirectUri !== context.redirectUri
        || !timingSafeEqual(transaction.proofHash, createHash('sha256').update(proof).digest())) return undefined
      transactions.delete(state)
      return transaction
    },
  }
}

export const oauthTransactions = createOAuthTransactionStore()
