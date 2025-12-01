import { defineConfig } from 'vitepress'
import MermaidExample from './mermaid-markdown-all'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Nuxt Aegis',
  description: 'OAuth-based authentication with JWT token management for Nuxt 3/4',
  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],

  vite: {
    ssr: {
      noExternal: ['mermaid'],
    },
    optimizeDeps: {
      // crappy mermaid dependencies
      exclude: [
        'vscode-languageserver-types',
        'vscode-jsonrpc',
        '@chevrotain/regexp-to-ast',
      ],
    },
  },

  markdown: {
    config: (md) => {
      MermaidExample(md)
    },
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.svg',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/getting-started/installation' },
      { text: 'API Reference', link: '/api/composables' },
      { text: 'GitHub', link: 'https://github.com/peterbud/nuxt-aegis' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Why nuxt-aegis?', link: '/getting-started/why-nuxt-aegis' },
          { text: 'Installation', link: '/getting-started/installation' },
          { text: 'Quick Start', link: '/getting-started/quick-start' },
        ],
      },
      {
        text: 'Architecture',
        items: [
          { text: 'Overview', link: '/architecture' },
          { text: 'Authentication Flow', link: '/architecture/authentication-flow' },
          { text: 'Token Lifecycle', link: '/architecture/token-lifecycle' },
          { text: 'Project Structure', link: '/architecture/project-structure' },
        ],
      },
      {
        text: 'Providers',
        items: [
          { text: 'Overview', link: '/providers/' },
          { text: 'Google', link: '/providers/google' },
          { text: 'Auth0', link: '/providers/auth0' },
          { text: 'GitHub', link: '/providers/github' },
          { text: 'Mock Provider', link: '/providers/mock' },
          { text: 'Custom Provider', link: '/providers/custom' },
        ],
      },
      {
        text: 'Configuration',
        items: [
          { text: 'Overview', link: '/configuration/' },
          { text: 'Environment Variables', link: '/configuration/environment' },
          { text: 'Storage', link: '/configuration/storage' },
        ],
      },
      {
        text: 'Guides',
        items: [
          { text: 'Client Authentication', link: '/guides/client-auth' },
          { text: 'Route Protection', link: '/guides/route-protection' },
          { text: 'Custom Claims', link: '/guides/custom-claims' },
          { text: 'Logic Handlers', link: '/guides/handlers' },
          { text: 'Authentication Hooks', link: '/guides/hooks' },
          { text: 'Token Refresh', link: '/guides/token-refresh' },
          { text: 'Authorization CODE Flow', link: '/guides/authorization-code' },
          { text: 'Impersonation', link: '/guides/impersonation' },
          { text: 'Password Authentication', link: '/guides/password-auth' },
        ],
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Composables', link: '/api/composables' },
          { text: 'Endpoints', link: '/api/endpoints' },
          { text: 'Server Utilities', link: '/api/server-utils' },
          { text: 'Event Handlers', link: '/api/event-handlers' },
          { text: 'Types', link: '/api/types' },
        ],
      },
      {
        text: 'Security',
        items: [
          { text: 'Overview', link: '/security/' },
          { text: 'Best Practices', link: '/security/best-practices' },
        ],
      },
      {
        text: 'More',
        items: [
          { text: 'Troubleshooting', link: '/troubleshooting/' },
          { text: 'Contributing', link: '/contributing' },
          { text: 'Development', link: '/development' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/peterbud/nuxt-aegis' },
    ],

    editLink: {
      pattern: 'https://github.com/peterbud/nuxt-aegis/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    search: {
      provider: 'local',
      options: {
        detailedView: true,
      },
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 Peter Budai',
    },
  },

  lastUpdated: true,
})
