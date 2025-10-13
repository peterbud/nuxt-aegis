import type { RouterConfig } from '@nuxt/schema'

export default {
  scrollBehavior(to, from, savedPosition) {
    // Check if the current route is your specific callback page
    if (to.name === 'auth-callback' || to.path === '/auth-callback') {
      // If it's your callback page, prevent Vue Router from trying to scroll to the hash.
      // Returning null, undefined, or an empty object will prevent scrolling.
      // This stops the internal check that causes a warning that hash id is invalid.
      return false
    }

    // Default scroll behavior for other pages:
    // Scroll to the saved position on back/forward navigation
    if (savedPosition) {
      return savedPosition
    }

    // Otherwise, scroll to the top of the page (default Vue Router behavior)
    return { top: 0, left: 0 }
  },
} satisfies RouterConfig
