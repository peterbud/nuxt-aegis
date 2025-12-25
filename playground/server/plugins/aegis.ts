import type {
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
  dbGetAllUsers,
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

    /**
     * Persist user data and return enriched information
     * Unified handler for both OAuth and password authentication
     */
    onUserPersist: async (user, { provider }) => {
      const userEmail = user.email as string
      if (!userEmail) {
        throw new Error('User email is required for persistence')
      }

      console.log(`[Aegis Plugin] Persisting user for provider: ${provider}`)

      // Handle password provider
      if (provider === 'password') {
        // For password authentication, user includes hashedPassword
        const hashedPassword = user.hashedPassword as string

        // Check if user already exists in database
        let dbUser = dbGetUserByEmail(userEmail)

        if (dbUser) {
          // Update existing user's password
          dbUpdateUser(dbUser.id, { hashedPassword })
          console.log(`[Aegis Plugin] Updated password for existing user: ${dbUser.email}`)
        }
        else {
          // Create new user - determine role based on email
          const role = userEmail === 'admin@example.com' ? 'admin' : 'user'
          const permissions = userEmail === 'admin@example.com'
            ? ['read', 'write', 'delete', 'admin']
            : ['read']

          dbUser = dbAddUser({
            email: userEmail,
            name: user.name as string || userEmail.split('@')[0],
            picture: user.picture as string || '',
            role,
            permissions,
            organizationId: 'default',
            providers: [{ name: 'password', id: userEmail }],
          })

          // Update with hashed password
          dbUpdateUser(dbUser.id, { hashedPassword })
          console.log(`[Aegis Plugin] Created new password user: ${dbUser.email} with role: ${role}`)
        }

        // Return enriched data
        return {
          userId: dbUser.id,
          role: dbUser.role,
          permissions: dbUser.permissions,
          organizationId: dbUser.organizationId,
        }
      }

      // Handle OAuth providers
      const providerId = String(user.id || user.sub)

      // 1. Check if user exists with this provider
      let dbUser = dbFindUserByProvider(provider, providerId)

      if (dbUser) {
        // 2. User found, update last login
        dbUpdateUser(dbUser.id, { lastLogin: new Date().toISOString() })
        console.log(`[Aegis Plugin] User ${dbUser.name} found, last login updated.`)
      }
      else {
        // 3. No user found with this provider, check by email
        const existingUser = dbGetUserProfile(userEmail)

        if (existingUser) {
          // 4. User with same email found, link new provider
          dbLinkProviderToUser(existingUser.id, { name: provider, id: providerId })
          dbUpdateUser(existingUser.id, { lastLogin: new Date().toISOString() })
          console.log(`[Aegis Plugin] Existing user ${existingUser.name} found, linked new provider ${provider}.`)
          dbUser = existingUser
        }
        else {
          // 5. No user found, create new user
          // Use role and permissions from provider if available, otherwise default to 'user'
          const newUser = dbAddUser({
            email: userEmail,
            name: (user.name as string) || '',
            picture: (user.picture as string) || '',
            role: (user.role as string) || 'user',
            permissions: (user.permissions as string[]) || ['read'],
            organizationId: (user.organizationId as string) || 'default',
            providers: [{ name: provider, id: providerId }],
          })
          console.log(`[Aegis Plugin] New user ${newUser.name} created with role: ${newUser.role}`)
          dbUser = newUser
        }
      }

      // Return enriched user data for JWT claims
      return {
        userId: dbUser.id,
        role: dbUser.role,
        permissions: dbUser.permissions,
        organizationId: dbUser.organizationId,
      }
    },

    /**
     * Generate custom claims for JWT tokens
     * Called after onUserPersist with merged user data
     */
    customClaims: async (user) => {
      return {
        role: user.role,
        permissions: user.permissions,
        organizationId: user.organizationId,
      }
    },

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
       * Send verification code to user
       * In a real app, integrate with email service (SendGrid, Mailgun, etc.)
       * This demo logs to console for testing
       */
      sendVerificationCode: async (email, code, type) => {
        const { sendMagicCodeEmail } = await import('../utils/sendEmail')
        await sendMagicCodeEmail(email, code, type)
      },
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

        // Try to find user by ID, email, or provider ID
        let targetUser = dbGetUserById(targetUserId)
        if (!targetUser) {
          targetUser = dbGetUserProfile(targetUserId)
        }
        // Also check by provider ID (e.g., mock-user-002)
        if (!targetUser) {
          const allUsers = dbGetAllUsers()
          targetUser = allUsers.find(u =>
            u.providers?.some(p => p.id === targetUserId),
          ) || null
        }

        if (!targetUser) {
          console.log('[Aegis Plugin] Target user not found')
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
   * Impersonation start hook
   * Called after successful impersonation (audit logging)
   *
   * This is fire-and-forget - errors won't block impersonation
   */
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
