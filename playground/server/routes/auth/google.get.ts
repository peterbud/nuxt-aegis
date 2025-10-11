export default defineOAuthGoogleEventHandler({
  // static custom claims
  customClaims: {
    role: 'user',
    permissions: ['read', 'write'],
  },
})
