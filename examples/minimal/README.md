# Minimal Example - Nuxt Aegis

A minimal example demonstrating Google OAuth authentication with Nuxt Aegis.

## Features

- Google OAuth login
- Simple authentication UI
- User session management
- Logout functionality

## Setup

1. **Install dependencies**

```bash
pnpm install
```

2. **Configure Google OAuth**

   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create a new OAuth 2.0 Client ID or use an existing one
   - Add `http://localhost:3000/auth/google` to authorized redirect URIs
   - Copy your Client ID and Client Secret

3. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` and add your Google OAuth credentials:

```env
NUXT_AEGIS_TOKEN_SECRET=your-secure-random-32-char-string
NUXT_AEGIS_PROVIDERS_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
NUXT_AEGIS_PROVIDERS_GOOGLE_CLIENT_SECRET=your-client-secret
```

1. **Run the development server**

```bash
pnpm dev
```

5. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000) and click "Sign in with Google"

## Project Structure

```
minimal/
├── app/
│   └── pages/
│       └── index.vue               # Main application component with login/logout UI
│   └── app.vue                      # Main application component with login/logout UI
├── server/
│   ├── routes/
│   │   └── auth/
│   │       └── google.get.ts        # Google OAuth handler
│   └── tsconfig.json                # Server TypeScript configuration
├── nuxt.config.ts                   # Nuxt configuration with Aegis module
├── package.json                     # Dependencies
├── .env.example                     # Example environment variables
├── tsconfig.json                    # TypeScript configuration
└── README.md                        # This file
```

## How It Works

1. **Configuration**: `nuxt.config.ts` sets up the Aegis module with Google provider
2. **Server Handler**: `server/routes/auth/google.get.ts` defines the OAuth handler using `defineOAuthGoogleEventHandler()`
3. **Authentication UI**: `app.vue` uses the `useAegisAuth()` composable to handle authentication
4. **Login Flow**: Clicking "Sign in with Google" redirects to `/auth/google` which initiates the OAuth flow
5. **Callback**: After authorization, Google redirects back to `/auth/google/callback` handled by the same route
6. **Session**: User session is encrypted and stored securely
6. **Logout**: Clicking "Log out" clears the session

## Learn More

- [Nuxt Aegis Documentation](../../docs/index.md)
- [Google Provider Guide](../../docs/providers/google.md)
- [Quick Start Guide](../../docs/getting-started/quick-start.md)
