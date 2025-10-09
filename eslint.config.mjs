// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

// Run `npx @eslint/config-inspector` to inspect the resolved config interactively
export default createConfigForNuxt({
  features: {
    // Rules for module authors
    tooling: true,
    // Rules for formatting
    stylistic: true,
  },
  dirs: {
    src: [
      './playground',
    ],
  },
})
  .override(
    'nuxt/typescript/rules',
    {
      rules: {
        'vue/multi-word-component-names': ['error', {
          // Allows 'index', 'default', and 'error' which are common Nuxt page names
          ignores: ['index', 'default', 'error'],
        }],
      },
    },
  )
  .append(
    // your custom flat config here...
  )
