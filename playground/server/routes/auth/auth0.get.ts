export default defineOAuthAuth0EventHandler({
  // Transform user object from Auth0's format
  onUserInfo: (user, _tokens, _event) => {
    console.log('[Auth0] Transforming user info:', {
      sub: user.sub,
      email: user.email,
    })

    // Auth0 provides standardized OIDC claims
    return {
      id: user.sub as string,
      email: user.email,
      name: user.name,
      picture: user.picture,
      // Add Auth0-specific fields
      auth0Id: user.sub,
      emailVerified: user.email_verified,
      updatedAt: user.updated_at,
    }
  },

  // React to successful authentication
  onSuccess: async ({ user, provider }) => {
    console.log('[Auth0] User authenticated successfully:', {
      userId: user.id,
      provider,
    })

    // Example: Track authentication event
    // await trackAuthEvent({
    //   userId: user.id,
    //   provider: 'auth0',
    //   timestamp: new Date(),
    // })
  },

  // static custom claims
  customClaims: {
    role: 'user',
    permissions: ['read', 'write'],
  },
})
