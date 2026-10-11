import { expectTypeOf, it } from 'vitest'
import type { AppRouteRules, RouteRuleConfig, NuxtRequestContext, RequestEvent, RuntimeConfig, PublicRuntimeConfig } from '@nuxt/schema'
import type { NuxtServerHooks, RuntimeConfig as ServerRuntimeConfig, PublicRuntimeConfig as ServerPublicRuntimeConfig } from 'nuxt/schema'
import type { useServerHooks } from 'nuxt/server'
import type { BaseTokenClaims, NuxtAegisRouteRules, NuxtAegisRuntimeConfig, SuccessHookPayload, OnError, OnUserInfo } from '../../src/runtime/types'
import type { requireAuth, getAuthUser } from '../../src/runtime/server/utils/auth'

it('exposes Aegis contracts through Nuxt-owned types', () => {
  expectTypeOf<AppRouteRules['nuxtAegis']>().toEqualTypeOf<NuxtAegisRouteRules | undefined>()
  expectTypeOf<RouteRuleConfig['nuxtAegis']>().toEqualTypeOf<NuxtAegisRouteRules | undefined>()
  expectTypeOf<NuxtRequestContext['user']>().toEqualTypeOf<BaseTokenClaims | undefined>()
  expectTypeOf<NuxtRequestContext['ssrAccessToken']>().toEqualTypeOf<string | undefined>()
  expectTypeOf<RequestEvent['context']['user']>().toEqualTypeOf<BaseTokenClaims | undefined>()
  expectTypeOf<SuccessHookPayload['event']['context']['user']>().toEqualTypeOf<BaseTokenClaims | undefined>()
  expectTypeOf<RuntimeConfig['nuxtAegis']>().toEqualTypeOf<NuxtAegisRuntimeConfig | undefined>()
  expectTypeOf<ServerRuntimeConfig['nuxtAegis']>().toEqualTypeOf<RuntimeConfig['nuxtAegis']>()
  expectTypeOf<ServerPublicRuntimeConfig['nuxtAegis']>().toEqualTypeOf<PublicRuntimeConfig['nuxtAegis']>()
  expectTypeOf<Parameters<NuxtServerHooks['nuxt-aegis:success']>[0]>().toEqualTypeOf<SuccessHookPayload>()
  expectTypeOf<ReturnType<typeof useServerHooks>['hook']>().toBeFunction()
})
it('preserves portable callback events and authenticated user narrowing', () => {
  type Claims = BaseTokenClaims & { role: string }
  expectTypeOf<Parameters<OnError>[0]>().toEqualTypeOf<RequestEvent>()
  expectTypeOf<Parameters<OnUserInfo>[2]>().toEqualTypeOf<RequestEvent>()
  expectTypeOf<SuccessHookPayload['event']>().toEqualTypeOf<RequestEvent>()
  expectTypeOf<Parameters<typeof requireAuth>[0]>().toEqualTypeOf<RequestEvent>()
  expectTypeOf<ReturnType<typeof requireAuth<Claims>>['context']['user']>().toEqualTypeOf<Claims>()
  expectTypeOf<ReturnType<typeof getAuthUser<Claims>>>().toEqualTypeOf<Claims | null>()
})
