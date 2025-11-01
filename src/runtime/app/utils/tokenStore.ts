import { ref } from 'vue'

/**
 * Internal token store - NOT exposed to module users
 * CL-18: Provides reactive access token storage in memory only
 * SC-7: Uses reactive reference variables that are cleared on page refresh
 */

// CL-18, SC-7: Reactive token reference shared across the module (in-memory only)
const accessToken = ref<string | null>(null)

/**
 * Get the current access token
 * @returns The current access token or null if not authenticated
 */
export function getAccessToken(): string | null {
  return accessToken.value
}

/**
 * Set a new access token in memory
 * CL-18: Store access token in memory as a reactive reference variable
 *
 * @param token - The access token to store
 */
export function setAccessToken(token: string | null): void {
  accessToken.value = token
}

/**
 * Clear the access token from memory
 * CL-19: Clear token on logout or session end
 */
export function clearAccessToken(): void {
  setAccessToken(null)
}

/**
 * Get reactive reference to the token (for internal use)
 * Useful when you need to watch for token changes
 *
 * @returns Reactive reference to the access token
 */
export function getAccessTokenRef() {
  return accessToken
}
