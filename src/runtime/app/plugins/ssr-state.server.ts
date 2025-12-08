import { defineNuxtPlugin, useState, useRequestEvent } from '#app'
import { filterTimeSensitiveClaims } from '../utils/tokenUtils'

export default defineNuxtPlugin(() => {
  const event = useRequestEvent()

  // If SSR auth populated event.context.user, initialize auth state
  // Filter out time-sensitive JWT claims to prevent hydration mismatches
  if (event?.context.user) {
    const user = event.context.user
    useState('auth-state', () => ({
      user: filterTimeSensitiveClaims(user),
      isLoading: false,
      error: null,
    }))
  }
})
