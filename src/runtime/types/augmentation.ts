import type { RuntimeConfig as SchemaRuntimeConfig, PublicRuntimeConfig as SchemaPublicRuntimeConfig } from '@nuxt/schema'
import type { NuxtAegisRuntimeConfig, RedirectConfig, LoggingConfig } from './config'
import type { TokenRefreshConfig } from './refresh'
import type { BaseTokenClaims } from './token'
import type { ClientMiddlewareConfig, NuxtAegisRouteRules } from './routes'
import type {
  UserInfoHookPayload,
  SuccessHookPayload,
  ImpersonateCheckPayload,
  ImpersonateFetchTargetPayload,
  ImpersonateStartPayload,
  ImpersonateEndPayload,
} from './hooks'

interface AegisRequestContext {
  user?: BaseTokenClaims
  originalUser?: {
    sub: string
    email?: string
    name?: string
  }
  ssrAccessToken?: string
}

/**
 * Module augmentations for external libraries
 */

declare module '@nuxt/schema' {
  interface AppRouteRulesExtensions {
    nuxtAegis?: NuxtAegisRouteRules
  }

  interface RouteRuleConfigExtensions {
    nuxtAegis?: NuxtAegisRouteRules
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Augment Nuxt's interface with shared auth fields.
  interface NuxtRequestContext extends AegisRequestContext { }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Augment Nuxt's interface with shared auth fields.
  interface RequestEventContext extends AegisRequestContext { }

  interface NuxtServerHooks {
    'nuxt-aegis:userInfo': (payload: UserInfoHookPayload) => Promise<void> | void
    'nuxt-aegis:success': (payload: SuccessHookPayload) => Promise<void> | void
    'nuxt-aegis:impersonate:check': (payload: ImpersonateCheckPayload) => Promise<void> | void
    'nuxt-aegis:impersonate:fetchTarget': (payload: ImpersonateFetchTargetPayload) => Promise<void> | void
    'nuxt-aegis:impersonate:start': (payload: ImpersonateStartPayload) => Promise<void> | void
    'nuxt-aegis:impersonate:end': (payload: ImpersonateEndPayload) => Promise<void> | void
  }

  interface RuntimeConfig {
    nuxtAegis?: NuxtAegisRuntimeConfig
  }

  interface PublicRuntimeConfig {
    nuxtAegis: {
      authPath: string
      loginPath: string
      callbackPath: string
      logoutPath: string
      refreshPath: string
      userInfoPath: string
      redirect: RedirectConfig
      tokenRefresh: TokenRefreshConfig
      clientMiddleware?: ClientMiddlewareConfig
      logging: LoggingConfig
      enableSSR: boolean
    }
  }
}

declare module 'nuxt/schema' {
  interface RuntimeConfig {
    nuxtAegis?: SchemaRuntimeConfig['nuxtAegis']
  }

  interface PublicRuntimeConfig {
    nuxtAegis: SchemaPublicRuntimeConfig['nuxtAegis']
  }
}
