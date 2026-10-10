export default defineOAuthGoogleEventHandler({
  onUserInfo: (providerUserInfo, _tokens, _event) => {
    return {
      id: providerUserInfo.sub as string,
      email: providerUserInfo.email,
      name: providerUserInfo.name,
      picture: providerUserInfo.picture,
    }
  },
})
