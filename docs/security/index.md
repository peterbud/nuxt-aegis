# Security Overview

Security features and best practices for Nuxt Aegis.

## Security Features

Nuxt Aegis implements multiple security layers to protect your authentication system.

### OAuth 2.0 + Authorization CODE Flow

✅ **Authorization CODE Flow** - Additional security layer with short-lived CODEs  
✅ **Single-Use CODEs** - CODEs deleted immediately after exchange  
✅ **60-Second Expiration** - CODEs expire quickly to minimize attack window  
✅ **No Token Exposure** - Access tokens never appear in URLs or browser history

[Learn more about Authorization CODE Flow →](/guides/authorization-code)

### JWT Token Security

✅ **Short-Lived Tokens** - 1-hour expiration (configurable)  
✅ **Cryptographic Signing** - HS256/RS256 algorithms  
✅ **Custom Claims Validation** - Automatic filtering of reserved claims  
✅ **Token Refresh** - Seamless token renewal without re-authentication

[Learn more about Token Refresh →](/guides/token-refresh)

### Refresh Token Security

✅ **Server-Side Storage** - Refresh tokens never sent to client  
✅ **HttpOnly Cookies** - Not accessible to JavaScript  
✅ **Encryption at Rest** - AES-256-GCM for sensitive data  
✅ **Token Revocation** - Immediate invalidation on logout

[Configure Storage →](/configuration/storage)

### Cookie Security

✅ **HttpOnly Flag** - Prevents XSS attacks  
✅ **Secure Flag** - HTTPS-only transmission  
✅ **SameSite Protection** - CSRF attack prevention  
✅ **Path Restriction** - Limited cookie scope

### Data Encryption

✅ **AES-256-GCM** - Industry-standard authenticated encryption  
✅ **Random IVs** - Unique initialization vector for each encryption  
✅ **Authentication Tags** - Tamper detection  
✅ **Key Rotation** - Support for encryption key updates

[Configure Encryption →](/configuration/storage#encryption-at-rest)

## Security Best Practices

Detailed security recommendations and implementation guides.

[View Security Best Practices →](/security/best-practices)

## Threat Protection

### Protected Against

| Threat | Protection Mechanism |
|--------|---------------------|
| **XSS** | HttpOnly cookies, CSP headers |
| **CSRF** | SameSite cookies, state parameter |
| **Token Theft** | Short-lived tokens, HTTPS-only |
| **Replay Attacks** | Single-use CODEs, token expiration |
| **Session Hijacking** | Secure cookies, token rotation |
| **Man-in-the-Middle** | HTTPS enforcement, secure cookies |

### Security Headers

Recommended security headers for production:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    routeRules: {
      '/**': {
        headers: {
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
      },
    },
  },
})
```

## Compliance

### GDPR Compliance

- ✅ User data encryption at rest
- ✅ Explicit consent through OAuth
- ✅ Data minimization (only necessary claims)
- ✅ Right to be forgotten (logout/token revocation)

### OWASP Top 10

Nuxt Aegis addresses key OWASP vulnerabilities:

- ✅ **A01:2021 – Broken Access Control** - Route protection, RBAC
- ✅ **A02:2021 – Cryptographic Failures** - AES-256-GCM encryption
- ✅ **A07:2021 – Identification and Authentication Failures** - OAuth 2.0, JWT

## Security Checklist

::: danger Production Security Checklist

### Required for Production

- [ ] Set strong `NUXT_AEGIS_TOKEN_SECRET` (32+ characters)
- [ ] Enable HTTPS (`secure: true` in cookies)
- [ ] Use Redis for refresh token storage (not filesystem)
- [ ] Enable encryption at rest
- [ ] Set `NODE_ENV=production`
- [ ] Never use Mock provider in production
- [ ] Configure secure CORS policies
- [ ] Implement rate limiting
- [ ] Set up security headers
- [ ] Regular security audits

### Recommended

- [ ] Implement session timeout
- [ ] Add two-factor authentication
- [ ] Monitor failed login attempts
- [ ] Log security events
- [ ] Rotate secrets regularly (every 90 days)
- [ ] Use managed OAuth providers
- [ ] Implement IP whitelisting for admin routes
- [ ] Add webhook signature verification

:::

## Reporting Security Issues

::: warning Security Vulnerability Disclosure

If you discover a security vulnerability in Nuxt Aegis:

1. **DO NOT** open a public GitHub issue
2. Email security concerns to the maintainers
3. Provide detailed reproduction steps
4. Allow time for patch development
5. Coordinate disclosure timeline

:::

## Related

- [Security Best Practices](/security/best-practices)
- [Storage Configuration](/configuration/storage)
- [Environment Variables](/configuration/environment)
