# Password Authentication Guide

This guide walks you through implementing password-based authentication with email verification in your Nuxt application using Nuxt Aegis.

## Overview

The password provider enables traditional username/password authentication with the following security features:

- Email verification via 6-digit magic codes
- Configurable password strength requirements
- Secure password reset flow
- Account linking with OAuth providers
- Session management and token refresh

## Prerequisites

- Nuxt Aegis installed and configured
- Email delivery service (SendGrid, Mailgun, etc.) or custom solution
- Database for storing user credentials

## Step 1: Configure Email Delivery

First, set up an email delivery method. This example uses SendGrid, but you can use any service.

### Install SendGrid (or your preferred service)

```bash
npm install @sendgrid/mail
```

### Create Email Utility

```typescript
// server/utils/email.ts
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function sendVerificationEmail(
  email: string,
  code: string,
  type: 'register' | 'login' | 'reset'
) {
  const subjects = {
    register: 'Complete Your Registration',
    login: 'Your Login Code',
    reset: 'Reset Your Password',
  }

  const messages = {
    register: 'Welcome! Please verify your email to complete registration.',
    login: 'Use this code to complete your login.',
    reset: 'Use this code to reset your password.',
  }

  await sgMail.send({
    to: email,
    from: 'noreply@yourdomain.com',
    subject: subjects[type],
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">${subjects[type]}</h1>
        <p style="color: #666; font-size: 16px;">${messages[type]}</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #333; font-size: 14px; margin: 0;">Your verification code:</p>
          <h2 style="color: #2196F3; font-size: 36px; letter-spacing: 8px; margin: 10px 0;">
            ${code}
          </h2>
        </div>
        <p style="color: #999; font-size: 14px;">
          This code expires in 10 minutes.<br>
          <strong>Do not share this code with anyone.</strong>
        </p>
      </div>
    `,
  })
}
```

## Step 2: Set Up Database Models

Define your user model with password authentication support.

### Prisma Example

```prisma
// prisma/schema.prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  hashedPassword  String?  // Nullable to support OAuth-only users
  name            String?
  picture         String?
  role            String   @default("user")
  emailVerified   Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // For OAuth linking
  providers       Provider[]
  
  @@index([email])
}

model Provider {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String   // e.g., "google", "github", "password"
  providerId String  // The ID from the provider
  
  @@unique([name, providerId])
  @@index([userId])
}
```

### Database Utilities

```typescript
// server/utils/db.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function findUserByEmail(email: string) {
  return await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { providers: true },
  })
}

export async function createOrUpdatePasswordUser(
  email: string,
  hashedPassword: string
) {
  const normalizedEmail = email.toLowerCase()
  
  return await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      hashedPassword,
      updatedAt: new Date(),
    },
    create: {
      email: normalizedEmail,
      hashedPassword,
      role: 'user',
      providers: {
        create: {
          name: 'password',
          providerId: normalizedEmail,
        },
      },
    },
  })
}
```

## Step 3: Configure Nuxt Aegis

Add the password provider configuration to your `nuxt.config.ts`:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@peterbud/nuxt-aegis'],
  
  nuxtAegis: {
    providers: {
      password: {
        // Magic code settings
        magicCodeTTL: 600, // 10 minutes
        magicCodeMaxAttempts: 5,
        
        // Password hashing
        passwordHashRounds: 12,
        
        // Password policy
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSpecial: false,
        },
      },
    },
    
    token: {
      secret: process.env.NUXT_AEGIS_TOKEN_SECRET!,
      expiresIn: '15m',
    },
    
    tokenRefresh: {
      enabled: true,
      automaticRefresh: true,
    },
  },
})
```

Then implement the handlers in your server plugin:

```typescript
// server/plugins/aegis.ts
export default defineNitroPlugin(() => {
  defineAegisHandler({
    // Unified database persistence for all auth methods
    onUserPersist: async (user, { provider }) => {
      if (provider === 'password') {
        const { createOrUpdatePasswordUser } = await import('../utils/db')
        const dbUser = await createOrUpdatePasswordUser(user.email as string, user.hashedPassword as string)
        
        return {
          userId: dbUser.id,
          name: dbUser.name,
          picture: dbUser.picture,
          role: dbUser.role,
        }
      }
      
      // Handle OAuth providers...
      // (see handlers guide for full example)
    },
    
    password: {
      // Look up user by email
      async findUser(email) {
        const { findUserByEmail } = await import('../utils/db')
        const user = await findUserByEmail(email)
        
        if (!user || !user.hashedPassword) {
          return null
        }
        
        return {
          id: user.id,
          email: user.email,
          hashedPassword: user.hashedPassword,
          name: user.name,
          picture: user.picture,
          role: user.role,
        }
      },
      
      // Send verification codes
      async sendVerificationCode(email, code, action) {
        const { sendVerificationEmail } = await import('../utils/email')
        await sendVerificationEmail(email, code, action)
      },
    },
  })
})
```

## Step 4: Create Frontend Components

### Registration Component

```vue
<template>
  <div class="auth-form">
    <h2>Create Account</h2>
    
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          placeholder="you@example.com"
        >
      </div>
      
      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          placeholder="Min 8 characters"
        >
      </div>
      
      <div class="form-group">
        <label for="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          v-model="confirmPassword"
          type="password"
          required
        >
      </div>
      
      <button type="submit" :disabled="loading">
        {{ loading ? 'Creating Account...' : 'Sign Up' }}
      </button>
    </form>
    
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="success" class="success">{{ success }}</div>
  </div>
</template>

<script setup lang="ts">
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

const handleSubmit = async () => {
  error.value = ''
  success.value = ''
  
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }
  
  loading.value = true
  
  try {
    const response = await $fetch('/auth/password/register', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value,
      },
    })
    
    success.value = 'Registration initiated! Check your email for verification code.'
    
    // Redirect to verification page
    navigateTo(`/verify?email=${encodeURIComponent(email.value)}&type=register`)
  }
  catch (err: any) {
    error.value = err.data?.message || 'Registration failed'
  }
  finally {
    loading.value = false
  }
}
</script>
```

### Verification Component

```vue
<template>
  <div class="verification-form">
    <h2>Enter Verification Code</h2>
    <p>We sent a 6-digit code to {{ email }}</p>
    
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <input
          v-model="code"
          type="text"
          maxlength="6"
          placeholder="000000"
          class="code-input"
          autofocus
        >
      </div>
      
      <button type="submit" :disabled="loading">
        {{ loading ? 'Verifying...' : 'Verify' }}
      </button>
    </form>
    
    <div v-if="error" class="error">{{ error }}</div>
    
    <button @click="resend" class="link-button">
      Resend Code
    </button>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const email = route.query.email as string
const type = route.query.type as 'register' | 'login'

const code = ref('')
const loading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  error.value = ''
  loading.value = true
  
  try {
    const endpoint = type === 'register' 
      ? 'register-verify' 
      : 'login-verify'
    
    // This will redirect to /auth/callback on success
    window.location.href = `/auth/password/${endpoint}?code=${code.value}`
  }
  catch (err: any) {
    error.value = err.data?.message || 'Verification failed'
    loading.value = false
  }
}

const resend = async () => {
  // Implement resend logic by calling the original endpoint again
}
</script>

<style scoped>
.code-input {
  font-size: 32px;
  letter-spacing: 8px;
  text-align: center;
  width: 100%;
  max-width: 300px;
}
</style>
```

### Login Component

```vue
<template>
  <div class="auth-form">
    <h2>Sign In</h2>
    
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
        >
      </div>
      
      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
        >
      </div>
      
      <button type="submit" :disabled="loading">
        {{ loading ? 'Signing In...' : 'Sign In' }}
      </button>
    </form>
    
    <div v-if="error" class="error">{{ error }}</div>
    
    <NuxtLink to="/reset-password" class="link">
      Forgot password?
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  error.value = ''
  loading.value = true
  
  try {
    await $fetch('/auth/password/login', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value,
      },
    })
    
    // Redirect to verification
    navigateTo(`/verify?email=${encodeURIComponent(email.value)}&type=login`)
  }
  catch (err: any) {
    error.value = err.data?.message || 'Login failed'
  }
  finally {
    loading.value = false
  }
}
</script>
```

## Step 5: Implement Account Linking

Link password accounts with OAuth providers using the success hook:

```typescript
// server/plugins/aegis.ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('nuxt-aegis:success', async (payload) => {
    const { provider, providerUserInfo } = payload
    const email = providerUserInfo.email as string
    
    if (!email) return
    
    // Find existing user by email
    const existingUser = await findUserByEmail(email)
    
    if (existingUser) {
      // Link the new provider
      await linkProvider(existingUser.id, provider, providerUserInfo.sub)
    }
    else {
      // Create new user
      await createUser({
        email,
        name: providerUserInfo.name,
        picture: providerUserInfo.picture,
        provider,
        providerId: providerUserInfo.sub,
      })
    }
  })
})
```

## Step 6: Add Password Change Feature

```vue
<template>
  <div class="settings-form">
    <h3>Change Password</h3>
    
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>Current Password</label>
        <input
          v-model="currentPassword"
          type="password"
          required
        >
      </div>
      
      <div class="form-group">
        <label>New Password</label>
        <input
          v-model="newPassword"
          type="password"
          required
        >
      </div>
      
      <div class="form-group">
        <label>Confirm New Password</label>
        <input
          v-model="confirmPassword"
          type="password"
          required
        >
      </div>
      
      <button type="submit" :disabled="loading">
        Update Password
      </button>
    </form>
    
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="success" class="success">{{ success }}</div>
  </div>
</template>

<script setup lang="ts">
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

const handleSubmit = async () => {
  error.value = ''
  success.value = ''
  
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'New passwords do not match'
    return
  }
  
  loading.value = true
  
  try {
    await $fetch('/auth/password/change', {
      method: 'POST',
      body: {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      },
    })
    
    success.value = 'Password updated successfully!'
    
    // Clear form
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  }
  catch (err: any) {
    error.value = err.data?.message || 'Failed to update password'
  }
  finally {
    loading.value = false
  }
}
</script>
```

## Security Best Practices

### 1. Environment Variables

Store sensitive configuration in environment variables:

```bash
# .env
NUXT_AEGIS_TOKEN_SECRET=your-secret-key-min-32-chars
SENDGRID_API_KEY=your-sendgrid-api-key
DATABASE_URL=your-database-url
```

### 2. Rate Limiting

Implement rate limiting on authentication endpoints, e.g. using [Nuxt Security](https://github.com/Baroshem/nuxt-security) module.


### 3. HTTPS Only

Always use HTTPS in production:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      siteUrl: process.env.NODE_ENV === 'production' 
        ? 'https://yourdomain.com'
        : 'http://localhost:3000',
    },
  },
})
```

### 4. Password Policy

Enforce strong passwords with the built-in policy:

```typescript
passwordPolicy: {
  minLength: 12,              // Longer is better
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,       // Enable special characters
}
```

## Example

The playground includes a fully functional password authentication demo with console-logged magic codes.

## Next Steps

- [Custom Claims](/guides/custom-claims) - Add custom data to tokens
- [Route Protection](/guides/route-protection) - Protect your routes
- [Security Best Practices](/security/best-practices) - Secure your app

## Related Documentation

- [Password Provider Reference](/providers/password)
- [Token Refresh](/guides/token-refresh)
- [Hooks](/guides/hooks)
