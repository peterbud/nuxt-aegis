export default defineOAuthGoogleEventHandler({
  // Transform user object from Google's format
  onUserInfo: (user, _tokens, _event) => {
    console.log('[Google] Transforming user info:', {
      rawUser: user,
      hasTokens: !!_tokens.access_token,
    })

    // Shape the user object to match your application's needs
    return {
      id: user.sub as string,
      email: user.email,
      name: user.name,
      picture: user.picture,
      // Add Google-specific fields
      googleId: user.sub,
      emailVerified: user.email_verified,
      locale: user.locale,
    }
  },

  // React to successful authentication
  onSuccess: async ({ user, provider }) => {
    console.log('[Google] User authenticated successfully:', {
      userId: user.id,
      provider,
      email: user.email,
    })

    // Example: Store or update user in database
    // In a real app, you would save to your database here
    // await db.users.upsert({
    //   id: user.id,
    //   email: user.email,
    //   name: user.name,
    //   provider,
    //   lastLogin: new Date(),
    // })
  },

  // static custom claims
  customClaims: {
    role: 'user',
    permissions: ['read', 'write'],
  },
})
