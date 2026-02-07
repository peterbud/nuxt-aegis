/**
 * Protected API endpoint — demonstrates the "clean" way to build
 * a protected route in nuxt-aegis:
 *
 * 1. Route protection is handled by Nitro routeRules
 *    (`'/api/**': { nuxtAegis: { auth: true } }` in nuxt.config.ts)
 * 2. The auth middleware validates the Bearer token and populates event.context.user
 * 3. This handler simply reads the authenticated user via getAuthUser()
 *
 * No manual JWT verification, no jose imports — just use the module.
 */
import { defineEventHandler, createError } from 'h3'

export default defineEventHandler((event) => {
  const user = getAuthUser(event)

  if (!user) {
    // Belt-and-suspenders — the route rule already blocks unauthenticated requests
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return {
    user: {
      sub: user.sub,
      email: user.email,
      name: user.name,
      role: (user as Record<string, unknown>).role,
    },
  }
})
