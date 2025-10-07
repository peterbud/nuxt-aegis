import { defineEventHandler, deleteCookie } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { SessionConfig } from '../../types'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const sessionConfig = config.nuxtAegis?.session as SessionConfig

  // Get the cookie name from runtime config
  const cookieName = sessionConfig?.cookieName || 'nuxt-aegis-session'

  // delete the session cookie
  deleteCookie(event, cookieName)

  return null
})
