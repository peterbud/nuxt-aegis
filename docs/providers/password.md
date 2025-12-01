# Password Provider

The Password Provider enables traditional username/password authentication with mandatory email verification via 6-digit magic codes. Users register with email and password, receive a verification code through a user-defined delivery callback (typically email), and must verify the code to complete authentication.

## Features

- ✅ **Email/Password Authentication** - Traditional registration and login
- ✅ **Magic Code Verification** - 6-digit codes with configurable TTL (default 10 minutes)
- ✅ **Rate Limiting** - Max verification attempts (default 5) with atomic operations
- ✅ **Password Policy** - Configurable strength requirements (length, uppercase, lowercase, numbers, special chars)
- ✅ **Password Reset Flow** - Secure password reset with session tokens
- ✅ **Password Change** - Authenticated endpoint for password updates with session preservation
- ✅ **Account Linking** - Automatically links to existing OAuth accounts by email
- ✅ **Custom Claims** - Add custom JWT claims (static or callback)
- ✅ **BCrypt Hashing** - Configurable hash rounds (default 12)

## Configuration

Configure the password provider in your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    providers: {
      password: {
        // Magic code settings
        magicCodeTTL: 600, // 10 minutes (in seconds)
        magicCodeMaxAttempts: 5, // Maximum verification attempts
        
        // Password hashing
        passwordHashRounds: 12, // BCrypt rounds (higher = more secure but slower)
        
        // Password strength policy
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSpecial: false,
        },
      },
    },
  },
})
```

Then implement the required handlers in your server plugin:

```typescript
// server/plugins/aegis.ts
export default defineNitroPlugin(() => {
  defineAegisHandler({
    password: {
      // Find user by email
      async findUser(email) {
        const user = await database.findUserByEmail(email)
        if (!user || !user.hashedPassword) return null
        
        return {
          id: user.id,
          email: user.email,
          hashedPassword: user.hashedPassword,
          // Include any additional fields for custom claims
          name: user.name,
          role: user.role,
        }
      },
      
      // Create or update user
      async upsertUser(user) {
        await database.upsertUser({
          email: user.email,
          hashedPassword: user.hashedPassword,
        })
      },
      
      // Send verification code
      async sendVerificationCode(email, code, action) {
        await sendEmail({
          to: email,
          subject: `Your ${action} verification code`,
          text: `Your code is: ${code}`,
        })
      },
    },
  })
})
```

## Required Callbacks

### `findUser`

Called to retrieve user data by email. Must return user with `hashedPassword` field or `null` if user doesn't exist.

**Parameters:**
- `email: string` - The user's email address (normalized to lowercase)

**Returns:**
- `PasswordUser | null` - User object with `hashedPassword` or `null`

**Example:**

```typescript
async findUser(email) {
  const user = await db.users.findOne({ email })
  
  if (!user || !user.hashedPassword) {
    return null
  }
  
  return {
    id: user.id,
    email: user.email,
    hashedPassword: user.hashedPassword,
    name: user.name,
    role: user.role,
    permissions: user.permissions,
  }
}
```

### `upsertUser`

Called to create or update a user with a new password. The password is already hashed using bcrypt.

**Parameters:**
- `user: PasswordUser` - The user object with `email` and `hashedPassword`

**Example:**

```typescript
async upsertUser(user) {
  await db.users.upsert({
    where: { email: user.email },
    update: { 
      hashedPassword: user.hashedPassword,
      updatedAt: new Date(),
    },
    create: {
      email: user.email,
      hashedPassword: user.hashedPassword,
      role: 'user',
      createdAt: new Date(),
    },
  })
}
```

### `sendVerificationCode`

Called when a verification code is generated. Use this to send the code to the user via email with a clickable link.

**Parameters:**
- `email: string` - The user's email address (normalized to lowercase)
- `code: string` - The 6-digit verification code
- `action: 'register' | 'login' | 'reset'` - The verification type

**Important:** Users should receive a clickable verification link in their email. The endpoints are GET requests that can be accessed via simple links:
- Registration: `/auth/password/register-verify?code={code}`
- Login: `/auth/password/login-verify?code={code}`
- Reset: `/auth/password/reset-verify?code={code}`

**Example with SendGrid:**

```typescript
import sgMail from '@sendgrid/mail'

async sendVerificationCode(email, code, action) {
  const templates = {
    register: 'Complete Your Registration',
    login: 'Complete Your Login',
    reset: 'Reset Your Password',
  }
  
  const endpoints = {
    register: 'register-verify',
    login: 'login-verify',
    reset: 'reset-verify',
  }
  
  const baseUrl = process.env.BASE_URL || 'https://yourdomain.com'
  const verifyLink = `${baseUrl}/auth/password/${endpoints[action]}?code=${code}`
  
  await sgMail.send({
    to: email,
    from: 'noreply@yourdomain.com',
    subject: templates[action],
    html: `
      <h1>Verification Code</h1>
      <p>Your verification code is: <strong style="font-size: 24px; letter-spacing: 4px;">${code}</strong></p>
      <p>Or click the button below to verify automatically:</p>
      <a href="${verifyLink}" style="display: inline-block; padding: 12px 24px; background: #2196F3; color: white; text-decoration: none; border-radius: 4px;">
        Verify ${action === 'register' ? 'Registration' : action === 'login' ? 'Login' : 'Reset'}
      </a>
      <p>This code expires in 10 minutes.</p>
      <p><strong>Do not share this code with anyone.</strong></p>
    `,
  })
}
```

## Authentication Flows

### Registration Flow

1. **User submits registration** (`POST /auth/password/register`)
   - Email and password are validated
   - Password strength is checked against policy
   - User existence is checked via `findUser`
   - Password is hashed with bcrypt
   - 6-digit code is generated
   - `sendVerificationCode` is called
   - Code is stored with email and hashed password

2. **User verifies code** (`POST /auth/password/register-verify`)
   - Code is validated (max attempts, expiration)
   - `upsertUser` is called to create user
   - `findUser` is called to get fresh user data
   - Custom claims are resolved
   - Aegis CODE is generated
   - User is redirected to `/auth/callback?code={aegis_code}`

### Login Flow

1. **User submits login** (`POST /auth/password/login`)
   - Email is validated
   - User is retrieved via `findUser`
   - Password is verified with bcrypt
   - 6-digit code is generated
   - `sendVerificationCode` is called
   - Code is stored

2. **User verifies code** (`POST /auth/password/login-verify`)
   - Code is validated (max attempts, expiration)
   - Fresh user data is retrieved via `findUser`
   - Custom claims are resolved
   - Aegis CODE is generated
   - User is redirected to `/auth/callback?code={aegis_code}`

### Password Reset Flow

1. **User requests reset** (`POST /auth/password/reset-request`)
   - Email is validated
   - User existence is checked via `findUser`
   - Returns success regardless (prevents enumeration)
   - If user exists, code is generated and `sendVerificationCode` is called

2. **User verifies code** (`POST /auth/password/reset-verify`)
   - Code is validated
   - Reset session is created (5-minute TTL)
   - Returns `sessionId`

3. **User sets new password** (`POST /auth/password/reset-complete`)
   - Session is validated and consumed
   - Password strength is checked
   - Password is hashed
   - `upsertUser` is called
   - All refresh tokens are invalidated

### Password Change Flow

1. **Authenticated user changes password** (`POST /auth/password/change`)
   - User authentication is verified
   - Current password is verified via `findUser` and bcrypt
   - New password strength is checked
   - New password is hashed
   - `upsertUser` is called
   - All refresh tokens except current session are invalidated
   - User stays logged in

## API Endpoints

All endpoints return JSON responses with appropriate HTTP status codes.

### `POST /auth/password/register`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true
}
```

**Errors:**
- `400` - Invalid email format
- `400` - Password doesn't meet policy requirements (with specific errors)
- `400` - User already exists
- `500` - Failed to send verification code

### `GET /auth/password/register-verify`

**Query Parameters:**
```
code=123456
```

**Response:**
```
302 Redirect to /auth/callback?code={aegis_code}
```

**Errors:**
- `400` - Invalid or expired code
- `400` - Maximum verification attempts exceeded

### `POST /auth/password/login`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true
}
```

**Errors:**
- `400` - Invalid email or password (generic to prevent enumeration)
- `500` - Failed to send verification code

### `GET /auth/password/login-verify`

**Query Parameters:**
```
code=123456
```

**Response:**
```
302 Redirect to /auth/callback?code={aegis_code}
```

**Errors:**
- `400` - Invalid or expired code
- `400` - Maximum verification attempts exceeded

### `POST /auth/password/reset-request`

**Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account exists, a reset code has been sent"
}
```

Always returns success to prevent user enumeration.

### `GET /auth/password/reset-verify`

**Query Parameters:**
```
code=123456
```

**Response:**
```
302 Redirect to /reset-password?session={sessionId}
```

**Note:** You should create a password reset page at `/reset-password` that accepts the `session` query parameter and allows the user to enter a new password.

**Errors:**
- `400` - Invalid or expired code
- `400` - Maximum verification attempts exceeded

### `POST /auth/password/reset-complete`

**Body:**
```json
{
  "sessionId": "base64-session-token",
  "newPassword": "NewSecurePass123"
}
```

**Response:**
```json
{
  "success": true
}
```

**Errors:**
- `400` - Invalid or expired reset session
- `400` - Password doesn't meet policy requirements

### `POST /auth/password/change`

**Requires authentication (Bearer token)**

**Body:**
```json
{
  "currentPassword": "SecurePass123",
  "newPassword": "NewSecurePass123"
}
```

**Response:**
```json
{
  "success": true
}
```

**Errors:**
- `401` - Not authenticated
- `400` - Current password is incorrect
- `400` - Password doesn't meet policy requirements

## Security Considerations

### Password Storage

Passwords are hashed using bcrypt with configurable rounds (default 12). Never store plaintext passwords. The `hashedPassword` field should only contain bcrypt hashes.

### Email Verification

All authentication flows require email verification via magic codes. This prevents:
- Automated account creation
- Email enumeration attacks (reset flow)
- Unauthorized access

### Rate Limiting

Magic codes have a maximum attempt limit (default 5) with atomic operations to prevent brute force attacks.

### Session Management

- Reset sessions expire after 5 minutes
- Password changes preserve the current session but invalidate all others
- Password resets invalidate all sessions

### Account Linking

Users are identified by email (normalized to lowercase). If a user registers with password authentication using the same email as an existing OAuth account, they can be automatically linked using the `nuxt-aegis:success` hook.

## Custom Claims

Add custom data to JWT tokens using the `customClaims` option:

```typescript
// Callback (dynamic)
customClaims: async (user) => {
  const subscription = await getSubscription(user.id)
  return {
    role: user.role,
    permissions: user.permissions,
    subscription: subscription.tier,
  }
}

// Static
customClaims: {
  provider: 'password',
  type: 'verified',
}
```

Claims are available in the JWT token and can be accessed via `useAuth().user`.

## TypeScript Types

```typescript
import type { PasswordProviderConfig, PasswordUser } from '#nuxt-aegis'

// User type for onUserLookup return value
interface PasswordUser {
  id?: string
  email: string
  hashedPassword: string
  [key: string]: unknown // Additional fields for custom claims
}

// Provider configuration
interface PasswordProviderConfig {
  magicCodeTTL?: number // Default: 600 (10 minutes)
  magicCodeMaxAttempts?: number // Default: 5
  passwordHashRounds?: number // Default: 12
  passwordPolicy?: {
    minLength?: number // Default: 8
    requireUppercase?: boolean // Default: true
    requireLowercase?: boolean // Default: true
    requireNumber?: boolean // Default: true
    requireSpecial?: boolean // Default: false
  }
  onMagicCodeGenerated: (
    email: string,
    code: string,
    type: 'register' | 'login' | 'reset'
  ) => Promise<void>
  onUserLookup: (email: string) => Promise<PasswordUser | null>
  onUserPersist: (email: string, hashedPassword: string) => Promise<void>
  customClaims?: CustomClaims<PasswordUser>
}
```

## Example Implementation

See the [Password Authentication Guide](/guides/password-auth) for a complete implementation example with database integration.

## Playground Example

Check out the [playground](https://github.com/peterbud/nuxt-aegis/tree/main/playground) for a working example with mock email delivery (console logging).

## Related

- [Custom Claims Guide](/guides/custom-claims)
- [Route Protection](/guides/route-protection)
- [Token Refresh](/guides/token-refresh)
- [Security Best Practices](/security/best-practices)
