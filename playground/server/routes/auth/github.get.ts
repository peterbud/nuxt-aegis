export default defineOAuthGithubEventHandler({
  // can be dynamic custom claims, like:
  customClaims: async (_user) => {
    // In real implementation, fetch user profile from database
    // Here we mock it for demonstration
    // For example, assume the user email is 'bob.wilson@example.com'
    const userProfile = dbGetUserProfile('bob.wilson@example.com')

    if (!userProfile) {
      throw new Error('User profile not found in database')
    }

    return {
      role: userProfile.role,
      permissions: userProfile.permissions,
      organizationId: userProfile.organizationId,
    }
  },
})
