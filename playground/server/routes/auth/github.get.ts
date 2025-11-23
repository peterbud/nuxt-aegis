export default defineOAuthGithubEventHandler({
  // Transform user object from GitHub's format
  onUserInfo: (providerUserInfo, _tokens, _event) => {
    console.log('[GitHub] Transforming user info:', {
      login: providerUserInfo.login,
      id: providerUserInfo.id,
    })

    // GitHub uses different field names, normalize them
    return {
      id: String(providerUserInfo.id),
      email: providerUserInfo.email,
      name: providerUserInfo.name || providerUserInfo.login, // GitHub might not have name
      picture: providerUserInfo.avatar_url,
      // Add GitHub-specific fields
      githubLogin: providerUserInfo.login,
      githubId: providerUserInfo.id,
      bio: providerUserInfo.bio,
      publicRepos: providerUserInfo.public_repos,
    }
  },

  // React to successful authentication
  onSuccess: async ({ providerUserInfo, provider }) => {
    console.log('[GitHub] User authenticated successfully:', {
      login: providerUserInfo.githubLogin,
      provider,
    })

    // Example: Sync with GitHub-specific data
    // await syncGitHubRepositories(user.githubLogin, tokens.access_token)
  },

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
