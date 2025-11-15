export default defineOAuthGithubEventHandler({
  // Transform user object from GitHub's format
  onUserInfo: (user, _tokens, _event) => {
    console.log('[GitHub] Transforming user info:', {
      login: user.login,
      id: user.id,
    })

    // GitHub uses different field names, normalize them
    return {
      id: String(user.id),
      email: user.email,
      name: user.name || user.login, // GitHub might not have name
      picture: user.avatar_url,
      // Add GitHub-specific fields
      githubLogin: user.login,
      githubId: user.id,
      bio: user.bio,
      publicRepos: user.public_repos,
    }
  },

  // React to successful authentication
  onSuccess: async ({ user, provider }) => {
    console.log('[GitHub] User authenticated successfully:', {
      login: user.githubLogin,
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
