# Requirements Specification - Nuxt Token Management Module

## 1. Introduction

This document specifies the functional and non-functional requirements for a Nuxt module that provides token-based authentication and authorization using the EARS (Easy Approach to Requirements Syntax) format.

## 2. Ubiquitous Requirements

**UR-1:** The module SHALL support Nuxt 3 and Nuxt 4 applications.

**UR-2:** The module SHALL comply with OAuth 2.0 and OpenID Connect standards WHERE authentication providers support these protocols.

**UR-3:** The module SHALL use JSON Web Tokens (JWT) as defined in RFC 7519.

## 3. Authentication Provider Requirements

### 3.1 Provider Abstraction

**PR-1:** WHEN a developer configures an authentication provider, the module SHALL provide a pluggable provider interface.

**PR-2:** WHERE an authentication provider is configured, the module SHALL support the following provider options:
    * Google,
    * Microsoft Entra ID (Azure AD),
    * GitHub,
    * Auth0,
    * Mock (for development and testing only)

**PR-3:** IF a custom authentication provider is needed, THEN the module SHALL allow developers to implement custom provider plugins.

### 3.2 Mock Provider (Development/Testing)

**PR-3.1:** The module SHALL provide a built-in Mock Provider for development and testing purposes, simulating the OAuth 2.0 flow without requiring real provider credentials or external network calls.

**PR-3.2:** The Mock Provider SHALL support defining multiple user personas (mock users) with customizable claims and properties for testing different authentication scenarios.

**PR-3.3:** The Mock Provider SHALL support error simulation by accepting query parameters to trigger standard OAuth error codes (e.g., `access_denied`, `invalid_request`).

**PR-3.4:** The Mock Provider SHALL generate valid JWT tokens with a distinguishable issuer (e.g., `nuxt-aegis-mock`) and support all standard claims and custom claims as with real providers.

**PR-3.5:** The Mock Provider SHALL be automatically disabled in production environments (`NODE_ENV === 'production'`) unless explicitly enabled by configuration (e.g., `enableInProduction: true`).

**PR-3.6:** The Mock Provider SHALL log prominent warnings when active in non-production environments and block access in production by default for security.

**PR-3.7:** The Mock Provider SHALL use the same authentication flow, endpoints, and callback handling as real providers to ensure test coverage and compatibility.

**PR-3.8:** The Mock Provider configuration SHALL require at least one mock user persona with `sub`, `email`, and `name` fields.

### 3.3 Password Provider (Username/Password Authentication)

**PR-4.1:** The module SHALL provide a built-in Password Provider that enables traditional username/password authentication with mandatory email verification via magic codes.

**PR-4.2:** The Password Provider SHALL support user registration with email and password credentials.

**PR-4.3:** The Password Provider SHALL support user login with email and password credentials.

**PR-4.4:** The Password Provider SHALL support password reset flow with email verification.

**PR-4.5:** The Password Provider SHALL support authenticated password change for logged-in users.

**PR-4.6:** WHERE the Password Provider is enabled, the module SHALL require developer-implemented callbacks for user persistence (`findUser`, `upsertUser`, `sendVerificationCode`).

**PR-4.7:** WHEN a password is stored, the Password Provider SHALL hash it using scrypt (Node.js built-in) with cryptographically secure salt.

**PR-4.8:** WHERE the Password Provider is configured, developers SHALL be able to override the default password hashing mechanism via `hashPassword` and `verifyPassword` callbacks.

**PR-4.9:** The Password Provider SHALL support configurable password strength policies including minimum length, uppercase/lowercase requirements, number requirements, and special character requirements.

**PR-4.10:** WHERE custom password validation is needed, developers SHALL be able to provide a `validatePassword` callback that returns `true` or an array of error messages.

**PR-4.11:** WHEN a user registers or logs in with the Password Provider, the module SHALL generate a 6-digit verification code.

**PR-4.12:** WHERE a verification code is generated, the module SHALL store it with configurable TTL (default 10 minutes) and maximum verification attempts (default 5).

**PR-4.13:** WHEN a verification code is stored, the module SHALL call the `sendVerificationCode` callback with email, code, and action type ('register', 'login', or 'reset').

**PR-4.14:** WHERE a verification code is verified, the module SHALL enforce maximum attempt limits with atomic operations to prevent race conditions.

**PR-4.15:** WHEN a verification code is successfully verified during registration or login, the module SHALL generate an Aegis authorization CODE and redirect to `/auth/callback?code={aegis_code}`.

**PR-4.16:** The Password Provider SHALL normalize email addresses to lowercase to ensure case-insensitive matching.

**PR-4.17:** WHERE a user attempts to register with an existing email, the Password Provider SHALL return a 409 Conflict error.

**PR-4.18:** WHERE a user attempts to login with invalid credentials, the Password Provider SHALL return a generic error message to prevent user enumeration.

**PR-4.19:** WHEN a password reset is requested, the Password Provider SHALL return success regardless of user existence to prevent email enumeration attacks.

**PR-4.20:** WHEN a password reset code is verified, the Password Provider SHALL create a temporary reset session with 5-minute TTL.

**PR-4.21:** WHEN a password reset is completed, the Password Provider SHALL invalidate all existing refresh tokens for the user.

**PR-4.22:** WHEN an authenticated user changes their password, the Password Provider SHALL verify the current password before allowing the change.

**PR-4.23:** WHEN a password change is completed, the Password Provider SHALL preserve the current session but invalidate all other refresh tokens.

**PR-4.24:** The Password Provider SHALL support custom claims (static or callback) that are resolved when generating application tokens.

**PR-4.25:** WHERE verification codes are sent, developers SHALL implement email delivery with clickable verification links to GET endpoints (`/auth/password/{action}-verify?code={code}`).

### 3.4 Initial Login (OAuth Providers)

**PR-5:** WHEN a user initiates login with an OAuth provider, the module SHALL initiate an OAuth flow that redirects the browser to the configured authentication provider's login page.

**PR-6:** WHEN the authentication provider returns an authorization code, the module SHALL exchange it for provider-specific tokens.

**PR-7:** IF the token exchange fails, THEN the module SHALL return an error response to the client with appropriate error details.

### 3.5 Provider Token Exchange (OAuth Providers)

**PR-8:** WHEN provider tokens are received, the module SHALL validate the tokens according to the provider's specifications.

**PR-9:** WHEN provider tokens are validated, the module SHALL extract user information from the tokens or userinfo endpoint.

**PR-10:** WHEN user information is extracted, the module SHALL generate a short-lived authorization CODE.

**PR-11:** WHEN an authorization CODE is generated, the module SHALL store it in a server-side in-memory key-value store with the associated user information and provider tokens.

**PR-12:** WHERE an authorization CODE is stored, the module SHALL set an expiration time of 60 seconds.

**PR-13:** WHEN the authorization CODE is stored, the module SHALL redirect the client to the callback endpoint (e.g., `/auth/callback`) with the CODE as a query parameter.

**PR-14:** IF the CODE storage or generation fails, THEN the module SHALL redirect to a configurable error URL with error information.

## 4. JWT Generation Requirements

### 4.1 Token Creation

**JT-1:** WHEN a user is successfully authenticated, the module SHALL generate an application-specific JWT.

**JT-2:** WHERE a JWT is generated, the module SHALL sign the token using a configurable secret or private key.

**JT-3:** WHERE a JWT is generated, the module SHALL support RS256 (RSA Signature with SHA-256) as a signing algorithm option.

**JT-4:** WHERE a JWT is generated, the module SHALL support HS256 (HMAC with SHA-256) as a signing algorithm option.

### 4.2 Standard Claims

**JT-5:** WHEN generating a JWT, the module SHALL include the `iss` (issuer) claim.

**JT-6:** WHEN generating a JWT, the module SHALL include the `sub` (subject) claim containing the user identifier.

**JT-7:** WHEN generating a JWT, the module SHALL include the `exp` (expiration time) claim.

**JT-8:** WHEN generating a JWT, the module SHALL include the `iat` (issued at) claim.

**JT-9:** WHERE configured, the module SHALL include the `aud` (audience) claim in generated JWTs.

### 4.3 Custom Claims

**JT-10:** WHERE custom claims are configured, the module SHALL allow developers to define custom claim mappings from provider tokens.

**JT-11:** WHERE custom claims are configured, the module SHALL allow developers to define custom claim values through static values or callback functions that receive the user object as input.

**JT-11a:** WHERE a custom claims callback function is configured, the module SHALL pass the complete user object (including all profile data and provider-specific properties) to the callback function.

**JT-11b:** WHERE a custom claims callback function is configured, the module SHALL support both synchronous and asynchronous callback functions that return a claims object.

**JT-12:** WHEN adding custom claims, the module SHALL prevent overriding reserved JWT claims (iss, sub, exp, iat, nbf, jti).

**JT-13:** WHERE custom claims are added, the module SHALL support primitive types (string, number, boolean) and arrays as claim values.

**JT-14:** WHEN generating tokens during refresh, the module SHALL reuse the same custom claims configuration (static values or callback function) by passing the stored user object to generate consistent custom claims.

**JT-15:** WHERE a custom claims callback is used, the module SHALL ensure the same callback function is invoked both during initial authentication and token refresh to maintain consistent claim generation logic.

### 4.4 Token Expiration

**JT-16:** WHERE token expiration is configured, the module SHALL allow developers to set custom expiration times for access and refresh tokens.

**JT-17:** IF no expiration time is configured for an access token, THEN the module SHALL use a default expiration of 15 minutes.

**JT-18:** IF no expiration time is configured for a refresh token, THEN the module SHALL use a default expiration of 7 days.

## 5. Middleware Requirements

### 5.1 Automatic JWT Validation

**MW-1:** WHEN a request is made to a protected route, the module SHALL provide middleware that automatically validates the JWT from the `Authorization: Bearer` header.

**MW-2:** WHERE JWT validation is performed, the module SHALL verify the token signature.

**MW-3:** WHERE JWT validation is performed, the module SHALL verify the token has not expired.

**MW-4:** WHERE JWT validation is performed, the module SHALL verify the token's issuer claim matches the configured issuer.

**MW-5:** IF the JWT is invalid or expired, THEN the middleware SHALL return a 401 Unauthorized response.

### 5.2 Claims Validation

**MW-6:** WHERE claim validation rules are configured, the middleware SHALL validate JWT claims against the configured rules.

**MW-7:** IF required claims are missing from the JWT, THEN the middleware SHALL return a 403 Forbidden response.

**MW-8:** IF claim values do not match the configured validation rules, THEN the middleware SHALL return a 403 Forbidden response.

### 5.3 User Data Injection

**MW-9:** WHEN a JWT is successfully validated, the middleware SHALL inject the decoded user data into the request context.

**MW-10:** WHERE user data is injected, the module SHALL make the user data accessible via `event.context.user` in Nuxt server routes.

**MW-11:** WHERE user data is injected, the module SHALL include all JWT claims in the user object.

### 5.4 Route Protection

**MW-12:** WHERE route protection is configured via Nitro routeRules, the module SHALL allow developers to specify authentication requirements using the `nuxtAegis.auth` property.

**MW-13:** The module SHALL support the following `nuxtAegis.auth` values: `true`, `'required'`, `'protected'` (route requires authentication), and `false`, `'public'`, `'skip'` (route is public).

**MW-14:** IF a route has `nuxtAegis.auth` set to `false`, `'public'`, or `'skip'`, THEN the module SHALL skip authentication for that route regardless of other patterns.

**MW-15:** WHEN `nuxtAegis.auth` is undefined for a route, the module SHALL NOT protect that route, requiring explicit opt-in via Nitro routeRules for server-side route protection.


## 6. Client-Side Requirements

### 6.1 Authentication Composable

**CL-1:** The module SHALL provide a composable (e.g., `useAuth()`) for accessing authentication state in Vue components.

**CL-2:** WHERE the authentication composable is used, the module SHALL provide a reactive `isLoggedIn` property indicating whether a user is logged in.

**CL-3:** WHERE the authentication composable is used, the module SHALL provide a reactive `isLoading` property indicating the authentication state is being initialized.

**CL-4:** WHERE the authentication composable is used, the module SHALL provide a reactive `user` property containing the current user's data.

**CL-5:** WHEN no user is authenticated, the `user` property SHALL be `null`.

**CL-6:** WHEN a user is authenticated, the `user` property SHALL contain all JWT claims from the application access token.

### 6.2 Authentication Methods

**CL-7:** WHERE the authentication composable is used, the module SHALL provide a `login()` method to initiate the authentication flow.

**CL-8:** WHERE the authentication composable is used, the module SHALL provide a `logout()` method to end the user session.

**CL-9:** WHEN the `login()` method is called with a provider name, the module SHALL initiate a browser redirect to the provider's authentication endpoint (e.g., `/auth/google`).

**CL-10:** WHEN the authentication callback receives an authorization CODE from the provider endpoint, the module SHALL automatically call the `/auth/token` endpoint with the CODE to exchange it for application tokens.

**CL-11:** WHEN the `logout()` method is called, the module SHALL clear the in-memory access token and authentication state.

### 6.3 State Synchronization

**CL-11:** WHEN authentication state changes, the module SHALL reactively update the composable properties across all components using the composable.

**CL-12:** WHEN the application initializes on the client, the module SHALL attempt to restore authentication state by requesting a new access token using the refresh token cookie.

**CL-13:** WHILE authentication state is being restored, the module SHALL set `isLoading` to `true` until the restore attempt completes.

### 6.4 User Profile Access

**CL-14:** WHERE the `useAuth()` composable is used, the reactive `user` property SHALL provide access to the current user's profile data.

**CL-15:** WHEN the user data changes (e.g., after login, logout, or token refresh), the `user` property SHALL reactively update across all components using the composable.

**CL-16:** WHERE the user is not authenticated, the `user` property SHALL remain `null` and be reactive to authentication state changes.

### 6.5 Automatic Token Attachment

**CL-17:** The module SHALL provide a mechanism to automatically attach the in-memory access token as an `Authorization: Bearer` header to internal API requests.

### 6.6 Token Storage

**CL-18:** WHEN an access token is obtained, the module SHALL store it in memory as a reactive reference variable.

**CL-19:** WHEN the browser window is closed or refreshed, the in-memory access token SHALL be cleared.

**CL-20:** WHEN the application needs to restore authentication state after a refresh, the module SHALL use the refresh token cookie to obtain a new access token.

### 6.7 Authentication Callback Handling

**CL-21:** The module SHALL provide a callback handler at `/auth/callback` to receive the authorization CODE from provider endpoints.

**CL-22:** WHEN the callback endpoint receives a CODE as a query parameter, the module SHALL automatically exchange it for application tokens by calling the `/auth/token` endpoint.

**CL-23:** WHEN the token exchange is successful, the module SHALL store the access token in memory and update the authentication state.

**CL-24:** IF the token exchange fails, the module SHALL redirect to a configurable error URL or display an error message.

### 6.8 Client-Side Route Protection

**CL-25:** The module SHALL provide optional client-side route protection middleware to improve user experience by redirecting unauthenticated users before server API calls.

**CL-26:** WHERE client-side middleware is enabled (`clientMiddleware.enabled: true`), the module SHALL register two built-in middlewares: `auth-logged-in` and `auth-logged-out`.

**CL-27:** WHERE `clientMiddleware.global` is set to `true`, the module SHALL register the `auth-logged-in` middleware globally to protect all client-side routes by default.

**CL-28:** WHERE `clientMiddleware.global` is set to `true`, the module SHALL require `publicRoutes` to be configured with at least one route to prevent infinite redirect loops.

**CL-29:** WHERE `clientMiddleware.global` is set to `true`, the module SHALL automatically include `redirectTo` and `loggedOutRedirectTo` in the `publicRoutes` array to prevent redirect loops.

**CL-30:** WHERE `clientMiddleware.global` is set to `false`, the module SHALL register the `auth-logged-in` middleware as a named middleware that can be applied per-page via `definePageMeta`.

**CL-31:** WHERE `clientMiddleware.global` is set to `false`, the `auth-logged-in` middleware SHALL NOT check `publicRoutes` since the developer explicitly controls which pages use the middleware.

**CL-32:** WHERE `clientMiddleware.global` is set to `false` and `publicRoutes` is configured with a non-empty array, the module SHALL log a warning at build time that `publicRoutes` will be ignored.

**CL-33:** The `auth-logged-out` middleware SHALL always be registered as a named (non-global) middleware that redirects authenticated users away from login/register pages.

**CL-34:** The `auth-logged-out` middleware SHALL NOT check `publicRoutes` and SHALL only use the `loggedOutRedirectTo` configuration for redirection.

**CL-35:** Client-side middleware SHALL NOT enforce security and SHALL be considered a user experience enhancement complementary to server-side Nitro route rules.

## 7.Storage Requirements

### 7.1 Authorization CODE Storage Requirements

**CS-1:** The module SHALL provide a server-side in-memory key-value store for temporary authorization CODE storage.

**CS-2:** WHEN an authorization CODE is stored, the module SHALL associate it with user information and provider tokens retrieved during authentication.

**CS-3:** WHEN storing an authorization CODE, the module SHALL generate a cryptographically secure random CODE value.

**CS-4:** WHERE an authorization CODE is stored, the module SHALL set an expiration time of 60 seconds.

**CS-5:** WHEN an authorization CODE expires, the module SHALL automatically remove it from the key-value store.

**CS-6:** WHEN an authorization CODE is successfully exchanged for tokens, the module SHALL immediately delete it from the store to ensure single use.

**CS-7:** The module SHALL prevent authorization CODE reuse by validating that the CODE exists in the store before allowing token exchange.

**CS-8:** WHERE the key-value store is implemented, the module SHALL support automatic cleanup of expired CODEs to prevent memory leaks.

### 7.2 Magic Code Storage Requirements (Password Provider)

**MC-1:** WHERE the Password Provider is enabled, the module SHALL provide a server-side in-memory key-value store for temporary magic code storage.

**MC-2:** WHEN a magic code is generated, the module SHALL create a cryptographically secure 6-digit numeric code.

**MC-3:** WHEN storing a magic code, the module SHALL associate it with the user's email address (normalized to lowercase) and action type ('register', 'login', or 'reset').

**MC-4:** WHERE a magic code is stored for registration, the module SHALL also store the hashed password to be used after verification.

**MC-5:** WHERE a magic code is stored, the module SHALL set a configurable TTL with a default of 600 seconds (10 minutes).

**MC-6:** WHEN a magic code expires, the module SHALL automatically remove it from the key-value store.

**MC-7:** WHERE a magic code is verified, the module SHALL enforce a maximum attempt limit (default 5) using atomic operations to prevent race conditions.

**MC-8:** WHEN a magic code verification attempt is made, the module SHALL increment the attempt counter atomically before validation.

**MC-9:** WHERE maximum verification attempts are exceeded, the module SHALL invalidate the magic code and return an error.

**MC-10:** WHEN a magic code is successfully verified, the module SHALL immediately delete it from the store to ensure single use.

**MC-11:** WHERE password reset sessions are created, the module SHALL generate cryptographically secure session tokens with 5-minute TTL.

**MC-12:** WHEN a password reset session is stored, the module SHALL associate it with the user's email address for password reset completion.

**MC-13:** WHERE a password reset session is consumed during password reset completion, the module SHALL immediately delete it from the store to ensure single use.

**MC-14:** WHERE the magic code key-value store is implemented, the module SHALL support automatic cleanup of expired codes and sessions to prevent memory leaks.

**MC-15:** WHEN looking up magic codes, the module SHALL support efficient O(1) lookup operations using in-memory storage.

### 7.3 Refresh Token Storage Requirements

**RS-1:** The module SHALL provide a server-side persistent key-value store for refresh token storage that survives server restarts.

**RS-2:** WHEN a refresh token is stored, the module SHALL associate it with the complete user object obtained from the authentication provider.

**RS-3:** WHERE a user object is stored with a refresh token, the module SHALL include all user profile data (subject, email, name, picture) and any additional properties from the provider response.

**RS-4:** WHERE a refresh token is stored, the module SHALL include metadata including subject identifier (sub), expiration timestamp, and revocation status.

**RS-5:** WHEN a refresh token is stored, the module SHALL hash the token value before using it as the storage key to prevent token exposure.

**RS-6:** WHEN a refresh token expires, the module SHALL automatically remove it from the key-value store.

**RS-7:** WHEN a refresh token is revoked (e.g., during logout), the module SHALL mark it as revoked in the store to prevent further use.

**RS-8:** WHERE token rotation is enabled, the module SHALL optionally store a reference to the previous token hash to enable rotation tracking.

**RS-9:** WHERE the key-value store is implemented, the module SHALL support automatic cleanup of expired refresh tokens to prevent memory leaks.

**RS-10:** WHERE the persistent key-value store is implemented, the module SHALL use Nitro's storage layer with an appropriate driver (e.g., filesystem, Redis, database) to ensure data persists across server restarts.

**RS-11:** WHERE encryption-at-rest is enabled, the module SHALL encrypt user data before storing it in the persistent store to protect against storage backend compromise.

## 8. API Endpoint Requirements

### 8.1 Provider Authentication Endpoints

**EP-1:** The module SHALL provide a single authentication endpoint for each configured provider using the pattern `/auth/[provider-name]` (e.g., `/auth/google`, `/auth/github`, `/auth/microsoft`).

**EP-2:** WHEN a GET request is made to a provider endpoint without an authorization code, the module SHALL redirect the browser to that authentication provider's authorization page to initiate the OAuth flow.

**EP-3:** WHEN a GET request is made to a provider endpoint with an authorization code (OAuth callback), the endpoint SHALL perform the following steps in sequence: exchange the code for provider tokens, retrieve user information, generate an authorization CODE, and store it in the server-side key-value store.

**EP-4:** WHEN exchanging the authorization code, the provider endpoint SHALL use the provider-specific token exchange mechanism to obtain provider access and refresh tokens.

**EP-5:** WHEN provider tokens are obtained, the provider endpoint SHALL retrieve user information from the provider's userinfo endpoint or from the ID token claims.

**EP-6:** WHEN user information is retrieved, the provider endpoint SHALL generate a short-lived authorization CODE and store it along with the user information and provider tokens in a server-side in-memory key-value store.

**EP-7:** WHEN the authorization CODE is stored, the provider endpoint SHALL redirect the client to the common callback endpoint (`/auth/callback`) with the CODE as a query parameter.

**EP-8:** IF any step in the authentication process fails (token exchange, user info retrieval, or CODE generation), THEN the provider endpoint SHALL redirect to a configurable error URL with error information in query parameters.

**EP-9:** WHERE a provider is configured, the module SHALL automatically create the corresponding provider endpoint and register it as the OAuth callback URL.

### 8.2 Password Provider Endpoints

**EP-9.1:** WHERE the Password Provider is enabled, the module SHALL provide a `POST /auth/password/register` endpoint to register new users.

**EP-9.2:** WHEN a registration request is received, the endpoint SHALL validate email format, check password strength policy, verify user does not exist, hash the password, generate a 6-digit verification code, and call the `sendVerificationCode` callback.

**EP-9.3:** WHERE the Password Provider is enabled, the module SHALL provide a `GET /auth/password/register-verify` endpoint to verify registration codes.

**EP-9.4:** WHEN a registration verification request is received with a valid code, the endpoint SHALL call `upsertUser` to create the user, call `findUser` to retrieve fresh user data, resolve custom claims, generate an Aegis authorization CODE, and redirect to `/auth/callback?code={aegis_code}`.

**EP-9.5:** WHERE the Password Provider is enabled, the module SHALL provide a `POST /auth/password/login` endpoint to authenticate existing users.

**EP-9.6:** WHEN a login request is received, the endpoint SHALL find the user via `findUser`, verify the password, generate a 6-digit verification code, and call the `sendVerificationCode` callback.

**EP-9.7:** WHERE the Password Provider is enabled, the module SHALL provide a `GET /auth/password/login-verify` endpoint to verify login codes.

**EP-9.8:** WHEN a login verification request is received with a valid code, the endpoint SHALL retrieve fresh user data via `findUser`, resolve custom claims, generate an Aegis authorization CODE, and redirect to `/auth/callback?code={aegis_code}`.

**EP-9.9:** WHERE the Password Provider is enabled, the module SHALL provide a `POST /auth/password/reset-request` endpoint to initiate password reset.

**EP-9.10:** WHEN a reset request is received, the endpoint SHALL check user existence via `findUser`, generate a verification code if user exists, call `sendVerificationCode`, and return success regardless of user existence to prevent enumeration.

**EP-9.11:** WHERE the Password Provider is enabled, the module SHALL provide a `GET /auth/password/reset-verify` endpoint to verify reset codes.

**EP-9.12:** WHEN a reset verification request is received with a valid code, the endpoint SHALL create a temporary reset session with 5-minute TTL and redirect to a configurable reset page with `session` query parameter.

**EP-9.13:** WHERE the Password Provider is enabled, the module SHALL provide a `POST /auth/password/reset-complete` endpoint to complete password reset.

**EP-9.14:** WHEN a reset completion request is received, the endpoint SHALL validate the session token, check password strength, hash the new password, call `upsertUser`, and invalidate all refresh tokens for the user.

**EP-9.15:** WHERE the Password Provider is enabled, the module SHALL provide a `POST /auth/password/change` endpoint for authenticated password changes.

**EP-9.16:** WHEN a password change request is received, the endpoint SHALL require authentication via Bearer token, verify the current password via `findUser`, check new password strength, hash the new password, call `upsertUser`, and invalidate all refresh tokens except the current session.

**EP-9.17:** WHERE verification codes are used, the module SHALL enforce maximum attempt limits (default 5) and TTL (default 600 seconds) with atomic operations.

**EP-9.18:** WHEN verification codes are exhausted or expired, the Password Provider endpoints SHALL return a 400 Bad Request error with descriptive messages.

**EP-9.19:** WHERE password validation fails against the configured policy, the Password Provider SHALL return a 400 Bad Request error with an array of specific validation errors.

**EP-9.20:** WHEN the Password Provider is not configured or the required handler callbacks are not implemented, password endpoints SHALL return 404 Not Found or 500 Internal Server Error respectively.

### 8.3 Token Exchange Endpoint

**EP-10:** The module SHALL provide a `/auth/token` endpoint to exchange an authorization CODE for application tokens.

**EP-11:** WHEN a POST request is made to the token endpoint with a valid authorization CODE, the module SHALL retrieve the associated user information and provider tokens from the in-memory key-value store.

**EP-12:** WHEN the authorization CODE is successfully validated and retrieved, the module SHALL delete it from the key-value store to ensure single use.

**EP-13:** WHEN user information is retrieved from the CODE, the module SHALL generate an application-specific JWT access token containing the user information.

**EP-14:** WHEN an access token is generated, the module SHALL generate a refresh token and store it server-side in a persistent key-value store.

**EP-14a:** WHEN a refresh token is stored, the module SHALL associate it with the complete user object from the authentication provider (including email, name, picture, and any additional provider-specific properties).

**EP-14b:** WHERE a refresh token is stored, the module SHALL include metadata such as subject identifier (sub), expiration timestamp, and revocation status.

**EP-15:** WHEN application tokens are generated, the token endpoint SHALL return the access token in the JSON response body.

**EP-16:** WHEN a refresh token is generated, the token endpoint SHALL set it as a secure, `HttpOnly` cookie.

**EP-17:** IF the authorization CODE is invalid, expired, or not found in the key-value store, THEN the token endpoint SHALL return a 401 Unauthorized response.

**EP-18:** IF the authorization CODE has already been used (deleted from store), THEN the token endpoint SHALL return a 401 Unauthorized response to prevent replay attacks.

### 8.4 Logout Endpoint

**EP-19:** The module SHALL provide a `/auth/logout` endpoint to end the user session.

**EP-20:** WHEN a POST request is made to the logout endpoint, the module SHALL clear the refresh token cookie.

**EP-21:** WHEN a request is made to the logout endpoint, the module SHALL return a success response in JSON format.

**EP-22:** WHERE configured, the module SHALL support redirecting to a configurable post-logout URL after clearing the session.

### 8.5 User Info Endpoint

**EP-23:** The module SHALL provide a `/auth/me` endpoint to retrieve the current user's information.

**EP-24:** WHEN a request is made to the `/auth/me` endpoint with a valid access token in the `Authorization: Bearer` header, the module SHALL return the decoded user data from the token.

**EP-25:** WHEN a request is made to the `/auth/me` endpoint without a valid access token, the module SHALL return a 401 Unauthorized response.

**EP-26:** WHERE the user is authenticated, the `/auth/me` endpoint SHALL return user data in JSON format including all JWT claims.

### 8.6 Token Refresh Endpoint

**EP-27:** The module SHALL provide a `/auth/refresh` endpoint to obtain a new access token.

**EP-28:** WHEN a POST request is made to the refresh endpoint with a valid refresh token cookie, the module SHALL retrieve the stored user object from the server-side refresh token store.

**EP-28a:** WHEN generating a new access token via refresh, the module SHALL NOT require the old access token to be provided.

**EP-28b:** WHEN generating a new access token via refresh, the module SHALL reconstruct the token payload by passing the stored user object to the same custom claims configuration (static values or callback function) used during initial authentication.

**EP-29:** WHEN a refresh token is invalid or expired, the refresh endpoint SHALL return a 401 Unauthorized response.

**EP-30:** WHEN a new access token is generated via refresh, the module SHALL optionally rotate the refresh token and set a new refresh token cookie.

**EP-31:** WHERE `automaticRefresh` is configured, the module SHALL automatically attempt to refresh the access token when authentication state is initialized.

**EP-32:** WHEN automatic refresh is triggered, the module SHALL ensure only one refresh request is in-flight at a time to prevent overwhelming the endpoint.

**EP-33:** WHERE an API request receives a 401 Unauthorized response AND a refresh token cookie exists, the module SHALL attempt to refresh the token once and retry the original request before failing.

**EP-34:** The module SHALL provide a manual `refresh()` method in the `useAuth()` composable for developer-initiated token refresh.

## 9. Configuration Requirements

**CF-1:** WHEN configuring the module, developers SHALL be able to specify authentication provider settings in the Nuxt configuration file.

**CF-2:** WHERE providers are configured, the module SHALL validate that required provider credentials are present.

**CF-3:** WHERE JWT settings are configured, the module SHALL validate that either a secret or private key is provided.

**CF-4:** IF configuration validation fails, THEN the module SHALL throw an error during Nuxt initialization.

**CF-5:** WHERE environment-specific configuration is needed, the module SHALL support configuration via environment variables.

**CF-6:** WHERE API endpoints are configurable, the module SHALL allow developers to customize endpoint paths (e.g., changing `/auth/login` to a custom path).

**CF-7:** WHERE redirect URLs are configurable, the module SHALL allow developers to specify success and error redirect URLs for authentication flows.

**CF-8:** WHERE token storage is configured, the module SHALL store access tokens in memory by default and refresh tokens as HttpOnly cookies.

**CF-9:** WHERE the authorization CODE expiration time is configurable, the module SHALL allow developers to set a custom expiration time with a recommended default of 60 seconds.

**CF-9.1:** WHERE the Password Provider is configured, the module SHALL support configuring magic code time-to-live (TTL) in seconds with a default of 600 seconds (10 minutes).

**CF-9.2:** WHERE the Password Provider is configured, the module SHALL support configuring maximum magic code verification attempts with a default of 5.

**CF-9.3:** WHERE the Password Provider is configured, the module SHALL support configuring password hashing rounds with a default of 12.

**CF-9.4:** WHERE the Password Provider is configured, the module SHALL support configuring password strength policy including minimum length (default 8), uppercase requirement (default true), lowercase requirement (default true), number requirement (default true), and special character requirement (default false).

**CF-9.5:** WHERE the Password Provider is enabled, the module SHALL require developer implementation of three mandatory callbacks: `findUser`, `upsertUser`, and `sendVerificationCode` via `defineAegisHandler`.

**CF-9.6:** WHERE the Password Provider is configured, the module SHALL support optional callback overrides for `validatePassword`, `hashPassword`, and `verifyPassword` to customize password handling logic.

**CF-9.7:** WHERE the Password Provider is configured, the module SHALL validate that all required callbacks are implemented and throw an error if missing.

**CF-10:** WHERE encryption-at-rest is needed for stored user data, the module SHALL allow developers to enable encryption and configure an encryption key.

**CF-11:** WHERE the persistent storage backend provides its own encryption (e.g., encrypted database, encrypted Redis), the module's encryption-at-rest configuration SHALL be optional.

## 10. Security Requirements

**SC-1:** WHEN storing JWT signing secrets, the module SHALL NOT log or expose secrets in error messages.

**SC-2:** WHERE tokens are transmitted, the module SHALL require HTTPS in production environments.

**SC-3:** WHEN setting refresh token cookies, the module SHALL set the `HttpOnly` flag.

**SC-4:** WHEN setting refresh token cookies, the module SHALL set the `Secure` flag in production environments.

**SC-5:** WHEN setting refresh token cookies, the module SHALL set the `SameSite` attribute to `Lax` or `Strict`.

**SC-6:** The module SHALL be compatible with strict Content Security Policy (CSP) configurations.

**SC-7:** WHEN storing access tokens in memory, the module SHALL use reactive reference variables that are cleared on page refresh or window close.

**SC-8:** WHERE refresh tokens are set as cookies, the module SHALL set appropriate cookie attributes including `HttpOnly`, `Secure` (in production), and `SameSite`.

**SC-9:** WHEN generating authorization CODEs, the module SHALL use cryptographically secure random number generation to prevent code guessing attacks.

**SC-10:** WHERE authorization CODEs are stored, the module SHALL ensure they are single-use only by deleting them immediately after successful token exchange.

**SC-11:** WHEN authorization CODEs expire, the module SHALL automatically clean them up from the store to prevent unauthorized access.

**SC-12:** WHEN generating refresh tokens, the module SHALL use cryptographically secure random number generation.

**SC-13:** WHERE refresh tokens are stored server-side, the module SHALL hash the token value before using it as a storage key to prevent token exposure.

**SC-14:** WHEN storing user profile data with refresh tokens, the module SHALL ensure the data is stored server-side only and never exposed to the client.

**SC-15:** WHERE refresh tokens are revoked, the module SHALL prevent their use for generating new access tokens even if the token has not yet expired.

**SC-16:** WHERE user data is stored with refresh tokens in the persistent store, the module SHALL provide optional encryption-at-rest for sensitive user data.

**SC-17:** WHERE encryption-at-rest is enabled, the module SHALL use industry-standard encryption algorithms (e.g., AES-256-GCM) to encrypt user data before storing it.

**SC-18:** WHERE encryption-at-rest is enabled, the module SHALL allow developers to configure an encryption key via environment variables.

**SC-19:** WHERE encryption-at-rest is enabled and no encryption key is configured, the module SHALL throw an error during initialization to prevent unencrypted storage.

**SC-20:** WHEN retrieving user data from the refresh token store, the module SHALL automatically decrypt the data if encryption is enabled.

**SC-21:** WHERE the persistent storage backend is already encrypted (e.g., encrypted Redis, encrypted filesystem), the module's encryption-at-rest MAY be optional as a defense-in-depth measure.

**SC-22:** WHERE the Password Provider is used, the module SHALL hash passwords using scrypt (Node.js built-in) with cryptographically secure random salt before storage.

**SC-23:** WHEN the Password Provider generates magic codes, the module SHALL use cryptographically secure random number generation to create 6-digit verification codes.

**SC-24:** WHERE magic codes are stored, the module SHALL enforce TTL (default 10 minutes) and maximum attempts (default 5) with atomic operations to prevent brute force attacks.

**SC-25:** WHEN password reset is requested, the Password Provider SHALL return success regardless of user existence to prevent email enumeration attacks.

**SC-26:** WHEN login fails due to invalid credentials, the Password Provider SHALL return generic error messages that do not reveal whether the email exists to prevent user enumeration.

**SC-27:** WHERE reset sessions are created, the Password Provider SHALL use cryptographically secure tokens with short TTL (5 minutes) and ensure single-use consumption.

**SC-28:** WHEN passwords are changed or reset, the Password Provider SHALL invalidate all refresh tokens (except current session for password change) to prevent unauthorized access with old sessions.

**SC-29:** WHERE the Password Provider is enabled, the module SHALL normalize email addresses to lowercase to ensure consistent user identification and prevent duplicate accounts.

**SC-30:** WHEN verification codes are sent, the Password Provider SHALL use GET endpoints with query parameters to enable clickable email links for improved user experience.

**SC-31:** WHERE password validation is performed, the Password Provider SHALL enforce configurable strength policies to ensure minimum security standards.

## 11. Error Handling Requirements

**EH-1:** WHEN an authentication error occurs, the module SHALL provide descriptive error messages for debugging.

**EH-2:** IF token validation fails, THEN the module SHALL log the failure reason at debug level.

**EH-3:** WHERE errors are returned to clients, the module SHALL NOT expose sensitive information about the authentication system.

**EH-4:** IF an authorization CODE is invalid, expired, or already used, the module SHALL return a clear 401 Unauthorized response without revealing the specific reason to prevent information leakage.

**EH-5:** WHERE the Password Provider encounters invalid or expired magic codes, the module SHALL return a 400 Bad Request error with descriptive messages suitable for user feedback.

**EH-6:** WHEN password validation fails against the configured policy, the Password Provider SHALL return a 400 Bad Request error with an array of specific validation errors to help users create compliant passwords.

**EH-7:** WHERE the Password Provider is not configured but password endpoints are called, the module SHALL return a 404 Not Found error.

**EH-8:** WHEN required Password Provider callbacks are not implemented via `defineAegisHandler`, the module SHALL return a 500 Internal Server Error.

**EH-9:** IF email delivery fails during magic code sending, the Password Provider SHALL log the error and return a 500 Internal Server Error to indicate the operation cannot be completed.

**EH-10:** WHERE password reset sessions are invalid or expired, the Password Provider SHALL return a 400 Bad Request error with clear messaging.

**EH-11:** WHEN user registration fails due to existing email, the Password Provider SHALL return a 409 Conflict error to distinguish from validation errors.

## 12. Performance Requirements

**PF-1:** WHEN validating JWTs, the middleware SHALL complete validation in less than 50ms under normal conditions.

**PF-2:** WHERE token caching is implemented, the module SHALL cache provider public keys for signature validation.

**PF-3:** WHERE authorization CODEs are stored in the key-value store, the module SHALL support efficient lookup operations with O(1) time complexity.

**PF-4:** WHEN cleaning up expired authorization CODEs, the module SHALL perform cleanup operations without blocking active authentication requests.

**PF-5:** WHERE refresh tokens are stored in the key-value store, the module SHALL support efficient lookup operations with O(1) time complexity.

**PF-6:** WHEN cleaning up expired refresh tokens, the module SHALL perform cleanup operations without blocking active authentication or refresh requests.

**PF-7:** WHERE the Password Provider stores magic codes, the module SHALL support efficient lookup operations with O(1) time complexity using in-memory storage.

**PF-8:** WHEN cleaning up expired magic codes, the Password Provider SHALL perform cleanup operations without blocking active registration, login, or reset flows.

**PF-9:** WHERE password hashing is performed, the Password Provider SHALL use configurable hash rounds (default 12) to balance security and performance.

**PF-10:** WHEN verifying passwords, the Password Provider SHALL complete verification operations efficiently using scrypt's built-in constant-time comparison to prevent timing attacks.

**PF-11:** WHERE magic code verification is performed, the Password Provider SHALL use atomic operations for attempt tracking to prevent race conditions in concurrent verification attempts.

## 13. User Impersonation Requirements

### 13.1 Feature Configuration

**IM-1:** The module SHALL provide an optional user impersonation feature that is disabled by default.

**IM-2:** WHERE impersonation is enabled, the module SHALL require explicit configuration in the Nuxt config file.

**IM-3:** WHERE impersonation is configured, the module SHALL allow developers to specify the impersonated token expiration time with a default of 15 minutes (900 seconds).

### 13.2 Authorization

**IM-4:** WHEN a user attempts to impersonate another user, the module SHALL call a configurable Nitro hook (`nuxt-aegis:impersonate:check`) to determine if impersonation is allowed.

**IM-5:** WHERE the impersonation check hook is not implemented, the module SHALL throw a 500 error indicating the hook is required.

**IM-6:** WHEN impersonation is attempted while already impersonating, the module SHALL return a 403 Forbidden error to prevent impersonation chains.

**IM-7:** WHERE the impersonation check hook throws an error, the module SHALL propagate the error to deny impersonation.

### 13.3 Target User Lookup

**IM-8:** WHEN a user is authorized to impersonate, the module SHALL call a configurable Nitro hook (`nuxt-aegis:impersonate:fetchTarget`) to retrieve the target user's data.

**IM-9:** WHERE the fetch target hook is not implemented, the module SHALL throw a 500 error indicating the hook is required.

**IM-10:** WHEN the fetch target hook throws a 404 error, the module SHALL return a 404 Not Found response.

**IM-11:** WHERE the fetch target hook populates the result object with user data, the module SHALL use this data to generate the impersonated token.

### 13.4 Impersonated Token Generation

**IM-12:** WHEN generating an impersonated token, the module SHALL create a JWT containing the target user's claims.

**IM-13:** WHERE an impersonated token is generated, the module SHALL include an `impersonation` object containing the original user's ID, email, name, and all custom claims.

**IM-14:** WHERE an impersonated token is generated, the module SHALL include the impersonation start timestamp and optional reason in the impersonation context.

**IM-15:** WHEN generating an impersonated token, the module SHALL use a shorter expiration time than regular access tokens (default 15 minutes).

**IM-16:** WHERE an impersonated token is generated, the module SHALL NOT generate a refresh token to prevent long-lived impersonated sessions.

### 13.5 Session Restoration

**IM-17:** WHEN ending impersonation, the module SHALL validate that the current token contains an impersonation context.

**IM-18:** WHERE impersonation is being ended, the module SHALL attempt to fetch fresh data for the original user by calling the fetch target hook.

**IM-19:** IF the original user is not found in the database (404 error), the module SHALL fall back to the stored original user claims from the impersonation context.

**IM-20:** WHEN restoring the original session, the module SHALL generate a new access token with the original user's claims (either fresh or stored).

**IM-21:** WHEN restoring the original session, the module SHALL generate a new refresh token and set it as an HttpOnly cookie.

**IM-22:** WHERE the original user data includes custom claims, the module SHALL ensure all custom claims are restored in the new access token.

### 13.6 Audit Logging

**IM-23:** WHEN impersonation starts successfully, the module SHALL call a fire-and-forget Nitro hook (`nuxt-aegis:impersonate:start`) for audit logging.

**IM-24:** WHERE the start impersonation hook is called, the module SHALL pass the requester's token payload, target user's token payload, reason, IP address, user agent, and timestamp.

**IM-25:** IF the start impersonation hook throws an error, the module SHALL log a warning but NOT block the impersonation (fire-and-forget).

**IM-26:** WHEN impersonation ends successfully, the module SHALL call a fire-and-forget Nitro hook (`nuxt-aegis:impersonate:end`) for audit logging.

**IM-27:** WHERE the end impersonation hook is called, the module SHALL pass the restored user's token payload, impersonated user's token payload, IP address, user agent, and timestamp.

**IM-28:** IF the end impersonation hook throws an error, the module SHALL log a warning but NOT block the session restoration (fire-and-forget).

### 13.7 Client-Side API

**IM-29:** WHERE the `useAuth()` composable is used, the module SHALL provide an `isImpersonating` computed property that returns true when the current user token contains an impersonation context.

**IM-30:** WHERE the `useAuth()` composable is used, the module SHALL provide an `originalUser` computed property that returns the original user's ID, email, and name when impersonating.

**IM-31:** WHERE the `useAuth()` composable is used, the module SHALL provide an `impersonate(targetUserId, reason?)` method to start impersonation.

**IM-32:** WHERE the `useAuth()` composable is used, the module SHALL provide a `stopImpersonation()` method to end impersonation and restore the original session.

**IM-33:** WHEN the `impersonate()` method is called, the module SHALL make a POST request to `/auth/impersonate` with the target user ID and optional reason.

**IM-34:** WHEN impersonation starts successfully, the `impersonate()` method SHALL update the in-memory access token and authentication state.

**IM-35:** WHEN the `stopImpersonation()` method is called, the module SHALL make a POST request to `/auth/unimpersonate` with the current impersonated token.

**IM-36:** WHEN impersonation ends successfully, the `stopImpersonation()` method SHALL update the in-memory access token, set the refresh token cookie, and update the authentication state.

### 13.8 Server-Side Context

**IM-37:** WHEN the authentication middleware validates an impersonated token, the module SHALL inject the current user (impersonated) into `event.context.user`.

**IM-38:** WHERE an impersonated token is validated, the module SHALL additionally inject the original user's ID, email, and name into `event.context.originalUser`.

**IM-39:** WHERE server routes access `event.context.originalUser`, they SHALL be able to distinguish impersonated requests from normal requests.

### 13.9 API Endpoints

**IM-40:** WHERE impersonation is enabled, the module SHALL provide a `/auth/impersonate` POST endpoint to start impersonation.

**IM-41:** WHEN a POST request is made to `/auth/impersonate`, the module SHALL validate the request includes a valid access token in the Authorization header and a request body with `targetUserId` and optional `reason`.

**IM-42:** WHERE impersonation is enabled, the module SHALL provide a `/auth/unimpersonate` POST endpoint to end impersonation.

**IM-43:** WHEN a POST request is made to `/auth/unimpersonate`, the module SHALL validate the request includes a valid impersonated token in the Authorization header.

**IM-44:** WHEN impersonation endpoints are called with impersonation disabled, the module SHALL return a 404 Not Found response.

### 13.10 Token Refresh Restrictions

**IM-45:** WHEN a token refresh is attempted with an impersonated token, the module SHALL return a 403 Forbidden error with a message indicating impersonated sessions cannot be refreshed.

**IM-46:** WHERE an impersonated session expires, the user SHALL be required to call `stopImpersonation()` to restore the original session or re-impersonate to continue.

### 13.11 Security Requirements

**IM-47:** WHEN storing the impersonation context in the JWT, the module SHALL store only essential fields (original user ID, email, name, reason, timestamp, and custom claims) to minimize token size.

**IM-48:** WHERE an impersonated token is generated, the module SHALL use the same signing algorithm and secret as regular tokens.

**IM-49:** WHEN impersonation is attempted, the module SHALL log security events including the requester's identity, target user ID, IP address, and user agent.

**IM-50:** WHERE impersonation is enabled, the module SHALL prevent impersonation chains by checking for existing impersonation context in the requester's token.

## 14. Server-Side Rendering (SSR) Requirements

### 14.1 SSR Configuration

**SSR-1:** WHEN Nuxt SSR is enabled (`ssr: true`), the module SHALL default `enableSSR` to `true` to enable authenticated SSR automatically.

**SSR-2:** WHEN Nuxt SSR is disabled (`ssr: false`), the module SHALL ignore the `enableSSR` configuration and operate in client-only mode.

**SSR-3:** WHERE `enableSSR` is explicitly set to `true` but Nuxt SSR is disabled, the module SHALL log a warning indicating SSR authentication will not work.

**SSR-4:** WHERE authenticated SSR is enabled, developers SHALL be able to configure the SSR token expiration time via `tokenRefresh.ssrTokenExpiry` (default: `'5m'`).

### 14.2 SSR Authentication Flow

**SSR-5:** WHEN a server-side render occurs with `enableSSR: true`, the module SHALL validate the httpOnly refresh token cookie if present.

**SSR-6:** WHERE a valid refresh token is found during SSR, the module SHALL generate a short-lived access token using the configured `ssrTokenExpiry`.

**SSR-7:** WHERE an SSR access token is generated, the module SHALL store it in `event.context.ssrAccessToken` for use during the render.

**SSR-8:** WHERE an SSR access token is generated, the module SHALL populate `event.context.user` with the user's token payload.

**SSR-9:** WHEN generating SSR access tokens, the module SHALL process custom claims using the same logic as token refresh to ensure consistency.

**SSR-10:** WHERE the refresh token is invalid, expired, or revoked during SSR, the module SHALL skip authentication and allow unauthenticated SSR to proceed.

### 14.3 SSR Security Requirements

**SSR-11:** WHEN rendering pages with authenticated SSR, the module SHALL NOT include access tokens in the HTML payload or `__NUXT__` state.

**SSR-12:** WHERE SSR access tokens are generated, they SHALL remain in server-side `event.context` only and never be transmitted to the client.

**SSR-13:** WHEN generating SSR access tokens, the module SHALL NOT rotate the refresh token to avoid client/server conflicts.

**SSR-14:** WHERE authenticated SSR is enabled, the module SHALL still require client-side token refresh after hydration to obtain a long-lived client access token.

### 14.4 Server-Side API Plugin

**SSR-15:** WHERE `enableSSR` is `true`, the module SHALL register a server-side `$api` plugin that intercepts requests and attaches the SSR access token from `event.context.ssrAccessToken`.

**SSR-16:** WHEN the server-side `$api` plugin is used during SSR, it SHALL automatically include the `Authorization: Bearer {ssrAccessToken}` header.

**SSR-17:** WHERE the server-side `$api` plugin is invoked but no SSR access token exists, it SHALL make the request without authentication headers.

### 14.5 Data Fetching with SSR

**SSR-18:** WHERE authenticated SSR is enabled, `useAsyncData` and `useFetch` with `server: true` SHALL be able to call authenticated API routes during SSR.

**SSR-19:** WHEN using `useAsyncData` with authenticated endpoints, the module SHALL support both server-side (with SSR token) and client-side (with client token) data fetching.

**SSR-20:** WHERE developers want to skip SSR data fetching, they SHALL be able to set `ssr: false` in the Nuxt options.

### 14.6 Nitro Plugin Registration

**SSR-21:** WHERE `enableSSR` is `true`, the module SHALL register a Nitro server plugin that hooks into the `request` event to perform SSR authentication.

**SSR-22:** WHEN the SSR authentication plugin runs, it SHALL check if `event.context.user` is already set by auth middleware and skip processing to avoid duplication.

**SSR-23:** WHERE the SSR authentication plugin runs, it SHALL process authentication before the request reaches route handlers.
