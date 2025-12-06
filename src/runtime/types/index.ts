/**
 * Nuxt Aegis Type Definitions
 * Main barrel file for all type exports
 */

// Re-export augmentations (they auto-apply when imported)
import './augmentations'

// Token types
export type {
  TokenPayload,
  TokenConfig,
  RefreshTokenData,
  RefreshResponse,
  ClaimsValidationConfig,
  CustomClaimsCallback,
  ImpersonationContext,
} from './token'

// Provider types
export type {
  OAuthProviderConfig,
  GoogleProviderConfig,
  MicrosoftProviderConfig,
  GithubProviderConfig,
  Auth0ProviderConfig,
  MockProviderConfig,
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
  NitroAegisAuth,
  NuxtAegisRouteRules,
  ClientMiddlewareConfig,
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
  ImpersonateCheckPayload,
  ImpersonateFetchTargetPayload,
  ImpersonateStartPayload,
  ImpersonateEndPayload,
} from './hooks'

// Config types
export type {
  RedirectConfig,
  EndpointConfig,
  NuxtAegisRuntimeConfig,
  ModuleOptions,
  LoggingConfig,
  ImpersonationConfig,
} from './config'
