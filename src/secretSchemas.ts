import type { ModuleOptions } from './runtime/types'

const secretProviders = ['google', 'microsoft', 'github', 'auth0'] as const

const validateSecret = (value: unknown) => typeof value === 'string' && value.length > 0
  ? { value }
  : { issues: [{ message: 'Expected a non-empty string' }] }

const jsonSchema = () => ({ type: 'string', minLength: 1 })

/** Minimal Standard Schema (with Standard JSON Schema) for a required, non-empty string. */
export const requiredSecret = {
  '~standard': {
    version: 1,
    vendor: 'nuxt-aegis',
    validate: validateSecret,
    jsonSchema: { input: jsonSchema, output: jsonSchema },
  },
}

const orRequired = (value?: string) => value || requiredSecret

/**
 * Returns a copy of the module options where unset secrets are declared as required
 * runtime config schemas instead of empty strings. Values set by the user are kept.
 * The input is never mutated.
 */
export function declareSecretSchemas(options: ModuleOptions): Record<string, unknown> {
  const config: Record<string, unknown> = {
    ...options,
    token: { ...options.token, secret: orRequired(options.token?.secret) },
  }

  const encryption = options.tokenRefresh?.encryption
  if (encryption?.enabled) {
    config.tokenRefresh = {
      ...options.tokenRefresh,
      encryption: { ...encryption, key: orRequired(encryption.key) },
    }
  }

  if (options.providers) {
    const providers: Record<string, unknown> = { ...options.providers }
    for (const name of secretProviders) {
      const provider = options.providers[name]
      if (provider) {
        providers[name] = {
          ...provider,
          clientId: orRequired(provider.clientId),
          clientSecret: orRequired(provider.clientSecret),
        }
      }
    }
    config.providers = providers
  }

  return config
}
