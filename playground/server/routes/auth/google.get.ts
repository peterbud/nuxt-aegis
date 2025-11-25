export default defineOAuthGoogleEventHandler({
  // Transform user object from Google's format
  onUserInfo: (providerUserInfo, _tokens, _event) => {
    // Shape the user object to match your application's needs
    return {
      id: providerUserInfo.sub as string,
      email: providerUserInfo.email,
      name: providerUserInfo.name,
      picture: providerUserInfo.picture,
      // Add Google-specific fields
      googleId: providerUserInfo.sub,
      emailVerified: providerUserInfo.email_verified,
      locale: providerUserInfo.locale,
    }
  },

  // React to successful authentication
  onSuccess: async ({ providerUserInfo, provider }) => {
    console.log('[Google] User authenticated successfully:', {
      userId: providerUserInfo.id,
      provider,
      email: providerUserInfo.email,
    })

    // Example: Store or update user in database
    // In a real app, you would save to your database here
    // await db.users.upsert({
    //   id: providerUserInfo.id,
    //   email: providerUserInfo.email,
    //   name: providerUserInfo.name,
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
