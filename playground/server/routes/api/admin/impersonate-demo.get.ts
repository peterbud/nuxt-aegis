/**
 * Demo API route to test impersonation context
 * GET /api/admin/impersonate-demo
 *
 * This route demonstrates how to access both the current user
 * (potentially impersonated) and the original user context in server routes
 */
export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  const originalUser = event.context.originalUser

  return {
    message: 'Impersonation demo endpoint',
    isImpersonating: !!currentUser?.impersonation,
    currentUser: currentUser
      ? {
          sub: currentUser.sub,
          email: currentUser.email,
          name: currentUser.name,
          role: currentUser.role,
          permissions: currentUser.permissions,
        }
      : null,
    originalUser: originalUser
      ? {
          sub: originalUser.sub,
          email: originalUser.email,
          name: originalUser.name,
        }
      : null,
    impersonationContext: currentUser?.impersonation || null,
    hint: originalUser
      ? `You are ${originalUser.email} impersonating ${currentUser.email}`
      : currentUser
        ? `You are ${currentUser.email} (not impersonating)`
        : 'Not authenticated',
  }
})
