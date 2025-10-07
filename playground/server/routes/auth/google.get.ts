export default defineOAuthGoogleEventHandler({
  customClaims: {
    role: 'user',
    permissions: ['read', 'write'],
  },
  // can be dynamic custome claims, like:
  // customClaims: async (user, tokens) => {
  //   const userProfile = await db.getUserProfile(user.email)
  //   return {
  //     role: userProfile.role,
  //     permissions: userProfile.permissions,
  //     organizationId: userProfile.organizationId,
  //   }
  // },
})
