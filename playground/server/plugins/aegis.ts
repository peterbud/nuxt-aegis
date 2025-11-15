import type { UserInfoHookPayload, SuccessHookPayload } from '../../../src/runtime/types/hooks'

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
   */
  // @ts-expect-error - Type augmentation not available in playground, but works in consumer projects
  nitroApp.hooks.hook('nuxt-aegis:userInfo', async (payload: UserInfoHookPayload) => {
    console.log('[Aegis Plugin] Global user info transformation', {
      provider: payload.provider,
      userId: payload.user.id || payload.user.sub || payload.user.email,
      timestamp: new Date().toISOString(),
    })

    // Example: Add a custom field to all users
    // This demonstrates global user transformation across all providers
    payload.user.authenticatedAt = new Date().toISOString()
    payload.user.authProvider = payload.provider

    // You can also normalize user data here
    // For example, ensure all users have a consistent 'id' field
    if (!payload.user.id && payload.user.sub) {
      payload.user.id = payload.user.sub
    }

    // Return the modified user object
    // If you don't return anything, the original user object is used
    return payload.user
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
    console.log('[Aegis Plugin] Global success hook - user authenticated', {
      provider: payload.provider,
      userId: payload.user.id || payload.user.sub || payload.user.email,
      timestamp: new Date().toISOString(),
    })

    // Example: Save user to database
    // This runs for all providers automatically
    // await saveUserToDatabase(payload.user, payload.provider)

    // Example: Send analytics event
    // await analytics.track('user_authenticated', {
    //   provider: payload.provider,
    //   userId: payload.user.id,
    //   timestamp: new Date().toISOString(),
    // })

    // Note: Provider-level onSuccess hooks (defined in route handlers)
    // run BEFORE this global hook, allowing provider-specific logic
    // to execute first
  })
})
