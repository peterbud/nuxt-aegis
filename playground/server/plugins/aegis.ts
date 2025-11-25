import type { UserInfoHookPayload, SuccessHookPayload } from '../../../src/runtime/types/hooks'
import {
  dbAddUser,
  dbFindUserByProvider,
  dbGetUserProfile,
  dbLinkProviderToUser,
  dbUpdateUser,
} from '../utils/db'

/**
 * Example Nuxt Aegis server plugin demonstrating global hook usage
 *
 * This plugin shows how to define global default implementations for
 * authentication hooks that apply across all providers.
 *
 * Individual provider route handlers can still override these defaults
 * by providing their own onUserInfo or onSuccess callbacks.
 */

export default defineNitroPlugin((nitroApp) => {
  /**
   * Global user info transformation hook
   * Called after fetching user info from any provider, before storing it
   *
   * Use this to:
   * - Normalize user data across providers
   * - Add custom fields to all user objects
   * - Enrich user data from external sources
   *
   * IMPORTANT: This hook modifies the payload.providerUserInfo object in place.
   * Return the modified user object to use it.
   */
  // @ts-expect-error - Type augmentation not available in playground, but works in consumer projects
  nitroApp.hooks.hook('nuxt-aegis:userInfo', async (payload: UserInfoHookPayload) => {
    // Example: Add a custom field to all users
    // This demonstrates global user transformation across all providers
    payload.providerUserInfo.authenticatedAt = new Date().toISOString()
    payload.providerUserInfo.authProvider = payload.provider

    // You can also normalize user data here
    // For example, ensure all users have a consistent 'id' field
    if (!payload.providerUserInfo.id && payload.providerUserInfo.sub) {
      payload.providerUserInfo.id = payload.providerUserInfo.sub
    }

    // Return the modified user object so it gets used
    return payload.providerUserInfo
  })

  /**
   * Global success hook
   * Called after successful authentication for any provider
   *
   * Use this to:
   * - Log authentication events
   * - Send analytics
   * - Update user records in your database
   * - Trigger notifications
   */
  // @ts-expect-error - Type augmentation not available in playground, but works in consumer projects
  nitroApp.hooks.hook('nuxt-aegis:success', async (payload: SuccessHookPayload) => {
    const providerName = payload.provider
    const providerId = String(payload.providerUserInfo.id || payload.providerUserInfo.sub)
    const userEmail = payload.providerUserInfo.email as string

    if (!userEmail) {
      console.error('User email is missing, cannot process user persistence')
      return
    }

    // 1. Check if user exists with this provider
    let user = dbFindUserByProvider(providerName, providerId)

    if (user) {
      // 2. User found, update last login
      dbUpdateUser(user.id, { lastLogin: new Date().toISOString() })
      console.log(`[Aegis Plugin] User ${user.name} found, last login updated.`)
    }
    else {
      // 3. No user found with this provider, check by email
      const existingUser = dbGetUserProfile(userEmail)

      if (existingUser) {
        // 4. User with same email found, link new provider
        dbLinkProviderToUser(existingUser.id, { name: providerName, id: providerId })
        dbUpdateUser(existingUser.id, { lastLogin: new Date().toISOString() })
        console.log(`[Aegis Plugin] Existing user ${existingUser.name} found, linked new provider ${providerName}.`)
        user = existingUser
      }
      else {
        // 5. No user found, create new user
        const newUser = dbAddUser({
          email: userEmail,
          name: (payload.providerUserInfo.name as string) || '',
          picture: (payload.providerUserInfo.picture as string) || '',
          role: 'user',
          permissions: ['read'],
          organizationId: 'default',
          providers: [{ name: providerName, id: providerId }],
        })
        console.log(`[Aegis Plugin] New user ${newUser.name} created.`)
        user = newUser
        // user = existingUser
      }
    }
  })
})
