export default defineOAuthAuth0EventHandler({
  // Transform user object from Auth0's format
  onUserInfo: (providerUserInfo, _tokens, _event) => {
    console.log('[Auth0] Transforming user info:', {
      sub: providerUserInfo.sub,
      email: providerUserInfo.email,
    })

    // Auth0 provides standardized OIDC claims
    return {
      id: providerUserInfo.sub as string,
      email: providerUserInfo.email,
      name: providerUserInfo.name,
      picture: providerUserInfo.picture,
      // Add Auth0-specific fields
      auth0Id: providerUserInfo.sub,
      emailVerified: providerUserInfo.email_verified,
      updatedAt: providerUserInfo.updated_at,
    }
  },

  // React to successful authentication
  onSuccess: async ({ providerUserInfo, provider }) => {
    console.log('[Auth0] User authenticated successfully:', {
      userId: providerUserInfo.id,
      provider,
    })

    // Example: Track authentication event
    // await trackAuthEvent({
    //   userId: providerUserInfo.id,
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
