---
layout: home

hero:
  name: "Nuxt Aegis"
  text: "Authentication Module for Nuxt"
  tagline: OAuth-based authentication with JWT token management
  image:
    src: /logo.svg
    alt: Nuxt Aegis
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/installation
    - theme: alt
      text: View on GitHub
      link: https://github.com/peterbud/nuxt-aegis

features:
  - icon: 🔐
    title: OAuth 2.0 & OpenID Connect
    details: Support for Google, Microsoft Entra ID, GitHub, and Auth0 providers
  - icon: 🔑
    title: Username/Password Authentication
    details: Built-in password provider with magic link support for passwordless authentication
  - icon: 🎫
    title: JWT Token Management
    details: Automatic generation and validation of JSON Web Tokens (RFC 7519)
  - icon: 🧪
    title: Complete Testing Support
    details: Built-in mock provider for effortless testing - no external dependencies or configuration needed
  - icon: 🔄
    title: Automatic Token Refresh
    details: Built-in token refresh with configurable expiration times
  - icon: �
    title: $api Plugin with Auto Bearer Tokens
    details: Custom fetch instance that automatically injects bearer tokens and handles 401 token refresh
  - icon: �🛡️
    title: Route Protection
    details: Flexible middleware for protecting server and client routes with declarative configuration
  - icon: 🎭
    title: User Impersonation
    details: Admin users can impersonate others for debugging and support with full audit logging
  - icon: 🎨
    title: Custom Claims
    details: Add application-specific claims to JWT tokens
  - icon: 🗄️
    title: Database Agnostic
    details: No forced ORM or database - provides integration hooks to work with any storage layer (Prisma, Drizzle, raw SQL, MongoDB, etc.)
  - icon: 🍪
    title: Secure Cookie Management
    details: HTTP-only, secure cookies for refresh tokens
  - icon: 🥽
    title: Type Safe
    details: Written in TypeScript with full type definitions
  - icon: ⚒️
    title: Composable API
    details: Simple useAuth() composable for client-side authentication state
---

