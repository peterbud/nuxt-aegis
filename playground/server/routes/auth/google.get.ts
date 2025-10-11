export default defineOAuthGoogleEventHandler({
  // successRedirectsUrl: '/', // default
  customClaims: {
    role: 'user',
    permissions: ['read', 'write'],
  },
  // can be dynamic custom claims, like:
  // customClaims: async (user, tokens) => {
  //   const userProfile = await db.getUserProfile(user.email)
  //   return {
  //     role: userProfile.role,
  //     permissions: userProfile.permissions,
  //     organizationId: userProfile.organizationId,
  //   }
  // },
})
