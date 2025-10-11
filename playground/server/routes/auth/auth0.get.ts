export default defineOAuthAuth0EventHandler({
  // static custom claims
  customClaims: {
    role: 'user',
    permissions: ['read', 'write'],
  },
})
