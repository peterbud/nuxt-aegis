/**
 * Nuxt Aegis Type Definitions
 * Main barrel file for all type exports
 */

// Re-export augmentations (they auto-apply when imported)
import './augmentations'

// Token types
export type {
  BaseUser,
  TokenPayload,
  TokenConfig,
  RefreshTokenData,
  RefreshResponse,
  ClaimsValidationConfig,
  CustomClaimsCallback,
} from './token'

// Provider types
export type {
  OAuthProviderConfig,
  GoogleProviderConfig,
  MicrosoftProviderConfig,
  GithubProviderConfig,
  Auth0ProviderConfig,
  CustomProviderConfig,
  OAuthConfig,
} from './providers'

// Refresh types
export type {
  CookieConfig,
  TokenRefreshConfig,
  EncryptionConfig,
  StorageConfig,
} from './refresh'

// Auth Code types
export type {
  AuthCodeData,
  TokenExchangeRequest,
  TokenExchangeResponse,
  AuthCodeConfig,
} from './authCode'

// Route types
export type {
  RouteProtectionConfig,
} from './routes'

// Callback types
export type {
  OnError,
  OnUserInfo,
  OnSuccess,
  OnSuccessParams,
} from './callbacks'

// Hook types
export type {
  UserInfoHookPayload,
  SuccessHookPayload,
} from './hooks'

// Config types
export type {
  RedirectConfig,
  EndpointConfig,
  NuxtAegisRuntimeConfig,
  ModuleOptions,
} from './config'
