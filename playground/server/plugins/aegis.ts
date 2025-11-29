import type {
  UserInfoHookPayload,
  SuccessHookPayload,
  ImpersonateCheckPayload,
  ImpersonateFetchTargetPayload,
  ImpersonateStartPayload,
  ImpersonateEndPayload,
} from '../../../src/runtime/types'
import {
  dbAddUser,
  dbFindUserByProvider,
  dbGetUserProfile,
  dbGetUserById,
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

  /**
   * Impersonation check hook
   * Validates if the requesting user is allowed to impersonate others
   *
   * Default implementation: Only users with 'admin' role can impersonate
   * Throw an error to deny impersonation
   */
  // @ts-expect-error - Type augmentation not available in playground, but works in consumer projects
  nitroApp.hooks.hook('nuxt-aegis:impersonate:check', async (payload: ImpersonateCheckPayload) => {
    console.log('[Aegis Plugin] Impersonation check:', {
      requester: payload.requester.email,
      role: payload.requester.role,
      ip: payload.ip,
    })

    // Check if user has admin role
    if (payload.requester.role !== 'admin') {
      throw createError({
        statusCode: 403,
        message: 'Only administrators can impersonate users',
      })
    }

    // Passed - user is allowed to impersonate
  })

  /**
   * Fetch target user hook
   * Retrieves the target user data for impersonation
   *
   * This hook should populate result.userData or throw 404 if not found
   * Supports lookup by ID or email
   */
  // @ts-expect-error - Type augmentation not available in playground, but works in consumer projects
  nitroApp.hooks.hook('nuxt-aegis:impersonate:fetchTarget', async (
    payload: ImpersonateFetchTargetPayload,
    result: { userData?: Record<string, unknown> },
  ) => {
    console.log('[Aegis Plugin] Fetching target user:', {
      requester: payload.requester.email,
      targetUserId: payload.targetUserId,
    })

    // Try to find user by ID or email
    let targetUser = dbGetUserById(payload.targetUserId)
    if (!targetUser) {
      targetUser = dbGetUserProfile(payload.targetUserId)
    }

    if (!targetUser) {
      throw createError({
        statusCode: 404,
        message: `Target user not found: ${payload.targetUserId}`,
      })
    }

    // Optional: Check if requester can impersonate this specific user
    // For example, only allow impersonating users in the same organization
    if (payload.requester.organizationId && targetUser.organizationId !== payload.requester.organizationId) {
      throw createError({
        statusCode: 403,
        message: 'Cannot impersonate users from different organizations',
      })
    }

    console.log('[Aegis Plugin] Target user found:', {
      targetEmail: targetUser.email,
      targetRole: targetUser.role,
    })

    // Populate result.userData with fields that will become JWT claims
    result.userData = {
      sub: targetUser.id || targetUser.email,
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      picture: targetUser.picture,
      role: targetUser.role,
      permissions: targetUser.permissions,
      organizationId: targetUser.organizationId,
    }
  })

  /**
   * Impersonation start hook
   * Called after successful impersonation (audit logging)
   *
   * This is fire-and-forget - errors won't block impersonation
   */
  // @ts-expect-error - Type augmentation not available in playground, but works in consumer projects
  nitroApp.hooks.hook('nuxt-aegis:impersonate:start', async (payload: ImpersonateStartPayload) => {
    console.log('[Aegis Plugin] 🎭 IMPERSONATION STARTED', {
      admin: payload.requester.email,
      adminId: payload.requester.sub,
      target: payload.targetUser.email,
      targetId: payload.targetUser.sub,
      reason: payload.reason || '(no reason provided)',
      timestamp: payload.timestamp,
      ip: payload.ip,
      userAgent: payload.userAgent,
    })

    // In a real application, you would:
    // - Log to an audit database
    // - Send to a SIEM system
    // - Trigger monitoring alerts
    // - Record in compliance logs
  })

  /**
   * Impersonation end hook
   * Called after ending impersonation (audit logging)
   *
   * This is fire-and-forget - errors won't block session restoration
   */
  // @ts-expect-error - Type augmentation not available in playground, but works in consumer projects
  nitroApp.hooks.hook('nuxt-aegis:impersonate:end', async (payload: ImpersonateEndPayload) => {
    console.log('[Aegis Plugin] 🎭 IMPERSONATION ENDED', {
      admin: payload.restoredUser.email,
      adminId: payload.restoredUser.sub,
      wasImpersonating: payload.impersonatedUser.email,
      wasImpersonatingId: payload.impersonatedUser.sub,
      timestamp: payload.timestamp,
      ip: payload.ip,
      userAgent: payload.userAgent,
    })

    // In a real application, you would:
    // - Log the session restoration
    // - Update audit trail
    // - Clear impersonation flags in monitoring systems
  })
})
