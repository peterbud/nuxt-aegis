import type {
  SuccessHookPayload,
  ImpersonateStartPayload,
  ImpersonateEndPayload,
} from '#nuxt-aegis'
import {
  dbAddUser,
  dbFindUserByProvider,
  dbGetUserProfile,
  dbGetUserById,
  dbLinkProviderToUser,
  dbUpdateUser,
  dbGetUserByEmail,
  dbCreateOrUpdatePasswordUser,
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
   * Register Aegis Handler for logic
   */
  defineAegisHandler({
    /**
     * Password authentication handler
     * Required for password provider
     */
    password: {
      /**
       * Find a user by email
       * Used during login and registration checks
       */
      findUser: async (email) => {
        const user = dbGetUserByEmail(email)
        if (!user || !user.hashedPassword) {
          return null
        }
        return {
          id: user.id,
          email: user.email,
          hashedPassword: user.hashedPassword,
          name: user.name,
          picture: user.picture,
          role: user.role,
          permissions: user.permissions,
          organizationId: user.organizationId,
        }
      },

      /**
       * Create or update a user with password
       * Called after successful registration or password change
       */
      upsertUser: async (user) => {
        dbCreateOrUpdatePasswordUser(user.email, user.hashedPassword)
      },

      /**
       * Send verification code to user
       * In a real app, integrate with email service (SendGrid, Mailgun, etc.)
       * This demo logs to console for testing
       */
      sendVerificationCode: async (email, code, type) => {
        const { sendMagicCodeEmail } = await import('../utils/sendEmail')
        await sendMagicCodeEmail(email, code, type)
      },
    },
    /**
     * Global user info transformation
     * Called after fetching user info from any provider, before storing it
     */
    onUserInfo: async (payload) => {
      // Example: Add a custom field to all users
      payload.providerUserInfo.authenticatedAt = new Date().toISOString()
      payload.providerUserInfo.authProvider = payload.provider

      // You can also normalize user data here
      if (!payload.providerUserInfo.id && payload.providerUserInfo.sub) {
        payload.providerUserInfo.id = payload.providerUserInfo.sub
      }

      // Return the modified user object so it gets used
      return payload.providerUserInfo
    },

    impersonation: {
      /**
       * Impersonation check
       * Validates if the requesting user is allowed to impersonate others
       */
      canImpersonate: async (requester, _targetId, _event) => {
        console.log('[Aegis Plugin] Impersonation check:', {
          requester: requester.email,
          role: requester.role,
        })

        // Check if user has admin role
        if (requester.role !== 'admin') {
          return false
        }

        return true
      },

      /**
       * Fetch target user
       * Retrieves the target user data for impersonation
       */
      fetchTarget: async (targetUserId, _event) => {
        console.log('[Aegis Plugin] Fetching target user:', {
          targetUserId: targetUserId,
        })

        // Try to find user by ID or email
        let targetUser = dbGetUserById(targetUserId)
        if (!targetUser) {
          targetUser = dbGetUserProfile(targetUserId)
        }

        if (!targetUser) {
          return null
        }

        console.log('[Aegis Plugin] Target user found:', {
          targetEmail: targetUser.email,
          targetRole: targetUser.role,
        })

        // Return user data that will become JWT claims
        return {
          sub: targetUser.id || targetUser.email,
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.name,
          picture: targetUser.picture,
          role: targetUser.role,
          permissions: targetUser.permissions,
          organizationId: targetUser.organizationId,
        }
      },
    },
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

    // Handle password provider differently
    if (providerName === 'password') {
      // Password provider already created/updated the user via onUserPersist
      // Just ensure the user exists in our database
      const user = dbGetUserProfile(userEmail)

      if (user) {
        dbUpdateUser(user.id, { lastLogin: new Date().toISOString() })
        console.log(`[Aegis Plugin] Password user ${user.email} logged in.`)
      }
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
