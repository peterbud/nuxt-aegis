# Google Mock Test Fixture - Phase 1

This fixture provides mock Google OAuth endpoints for testing the Aegis module without requiring real Google credentials or external API calls.

## What Was Created

### Mock OAuth Endpoints

These endpoints simulate Google's OAuth 2.0 flow:

#### 1. `/mock-google/authorize` (GET)
- **Simulates:** `https://accounts.google.com/o/oauth2/v2/auth`
- **Purpose:** Google's authorization page
- **Behavior:** Auto-approves and redirects back with authorization code
- **Special Features:**
  - Validates OAuth parameters (client_id, redirect_uri, response_type)
  - Generates mock authorization codes
  - Supports error simulation via `?mock_error=<error_type>`

#### 2. `/mock-google/token` (POST)
- **Simulates:** `https://oauth2.googleapis.com/token`
- **Purpose:** Token exchange endpoint
- **Behavior:** Exchanges authorization code for OAuth tokens
- **Returns:**
  - `access_token`: Mock Google access token
  - `refresh_token`: Mock Google refresh token
  - `id_token`: Mock Google ID token
  - `expires_in`: 3600 seconds
  - `token_type`: "Bearer"
- **Validations:**
  - Code must be valid and not expired
  - Code is single-use (deleted after exchange)
  - Client ID must match
  - Redirect URI must match

#### 3. `/mock-google/userinfo` (GET)
- **Simulates:** `https://www.googleapis.com/oauth2/v3/userinfo`
- **Purpose:** User profile endpoint
- **Behavior:** Returns mock user profile data
- **Requires:** `Authorization: Bearer <access_token>` header
- **Returns:**
  ```json
  {
    "sub": "mock-google-user-12345",
    "email": "test@example.com",
    "email_verified": true,
    "name": "Test User",
    "given_name": "Test",
    "family_name": "User",
    "picture": "https://lh3.googleusercontent.com/a/mock-avatar",
    "locale": "en"
  }
  ```

### Mock Code Storage

**File:** `server/utils/mockCodeStore.ts`

Simulates Google's internal authorization code storage:
- Generates random authorization codes
- Stores codes with 60-second expiration
- Enforces single-use pattern (code deleted after retrieval)
- Validates code expiration
- Provides cleanup and stats functions

### Configuration

**File:** `nuxt.config.ts`

Configured Aegis module with:
- Mock Google OAuth credentials
- Token expiration settings
- Refresh token settings
- Required scopes (openid, profile, email)

## How It Works

### Complete OAuth Flow

1. **User initiates login** → Aegis redirects to `/mock-google/authorize`
2. **Mock authorize endpoint:**
   - Generates authorization code
   - Stores code with mock user ID
   - Redirects back to Aegis with code
3. **Aegis receives code** → Calls `/mock-google/token`
4. **Mock token endpoint:**
   - Validates code (single-use, not expired)
   - Returns mock OAuth tokens
5. **Aegis gets tokens** → Calls `/mock-google/userinfo`
6. **Mock userinfo endpoint:**
   - Validates access token
   - Returns mock user profile
7. **Aegis processes user data** → Generates Aegis JWT tokens

## Testing Capabilities

### Happy Path
- Complete OAuth flow without external dependencies
- Fast, deterministic test execution
- No rate limiting or network issues

### Error Scenarios
- Invalid authorization codes
- Expired codes
- Code reuse attempts
- Invalid client credentials
- Missing parameters
- Provider errors (via `?mock_error=` parameter)

### Security Testing
- Single-use code enforcement
- Code expiration validation
- Token format validation
- Authorization header validation

## Custom Mock Provider (Phase 2)

### Mock Google Provider Implementation

**File:** `server/providers/mockGoogle.ts`

A custom OAuth provider implementation that:
- Extends the real Google provider logic
- Overrides OAuth URLs to point to local mock endpoints
- Dynamically determines base URL from current request
- Uses identical query building, token exchange, and user extraction logic

**Key Features:**
- **Dynamic URL Resolution:** Automatically uses the test server's URL
- **Identical Logic:** Same OAuth flow as real Google provider
- **Drop-in Replacement:** Can swap between real and mock provider easily

### Auth Route

**File:** `server/routes/auth/google.get.ts`

The OAuth entry point that uses the mock provider:
- Route: `GET /auth/google`
- Uses `defineMockGoogleEventHandler()` instead of real Google handler
- Supports custom JWT claims
- Optional error handling callback

### Complete Flow with Mock Provider

1. **Test navigates to** `/auth/google`
2. **Aegis OAuth handler:**
   - Mock provider sets URLs to local endpoints
   - Redirects to `/mock-google/authorize`
3. **Mock authorize endpoint:**
   - Generates authorization code
   - Redirects back to `/auth/google` with code
4. **Aegis OAuth handler (callback):**
   - Exchanges code via `/mock-google/token`
   - Receives mock OAuth tokens
   - Fetches user via `/mock-google/userinfo`
   - Generates Aegis authorization CODE
5. **Aegis redirects to** `/auth/callback?code=<AEGIS_CODE>`
6. **Client exchanges CODE for JWT tokens**

## File Structure

```
test/fixtures/google-mock/
├── nuxt.config.ts              # Aegis configuration
├── package.json                # Package metadata
├── app/
│   ├── app.vue                 # Root component
│   └── pages/
│       └── index.vue           # Home page
└── server/
    ├── routes/
    │   ├── auth/
    │   │   └── google.get.ts      # OAuth entry point (uses mock provider)
    │   └── mock-google/           # Mock Google OAuth endpoints
    │       ├── authorize.get.ts   # Authorization page
    │       ├── token.post.ts      # Token exchange
    │       └── userinfo.get.ts    # User profile
    ├── providers/
    │   └── mockGoogle.ts          # Custom mock Google provider
    └── utils/
        └── mockCodeStore.ts       # Mock code storage
```

## Usage Notes

- All mock endpoints log their operations to console for debugging
- Codes expire after 60 seconds (typical OAuth lifetime)
- Single-use enforcement prevents replay attacks
- Mock user data is hardcoded but can be extended for different test scenarios
- Error simulation available via query parameters
