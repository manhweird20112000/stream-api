# Auth Service Design

## Goal

Implement an authentication service that supports pending email/password registration with email verification, email/password login, Google OAuth login through backend redirect/callback routes, and refresh-token based sessions. A person can use multiple login providers while still owning one application user account.

## Architecture

The module uses a light Clean Architecture layout:

- `domain` contains auth models and ports.
- `application` contains use cases and application services. It must not import TypeORM entities, TypeORM repositories, Nest JWT, or Node crypto directly.
- `infrastructure` implements persistence, password hashing, refresh-token generation, JWT signing, and Google OAuth.
- `presentation` contains HTTP controllers and DTOs.

The persistence model is multi-provider:

- `users` stores the application account profile and optional password hash.
- `auth_identities` stores provider-specific identities such as `email`, `google`, `github`, `apple`, or later providers.
- `auth_refresh_tokens` stores hashed refresh tokens for rotation, logout, and session revocation.
- `auth_email_verifications` stores hashed one-time verification codes for pending email registrations.
- `outbox_events` stores durable side-effect events, including verification email requests, in the same transaction as registration changes.

Provider-specific logic stays in the auth module. User linking is based on verified provider identity first, then normalized email when the provider email is verified. Email/password accounts can log in only after verification. If an email/password account is still pending verification, a repeated registration overwrites the previous pending password hash and invalidates the previous verification code.

## HTTP API

- `POST /api/v1/auth/register`
  - Body: `email`, `password`
  - Creates or overwrites a pending registration draft.
  - Persists the user, email identity, verification row, and `auth.email_verification_requested` outbox event in one database transaction.
  - Does not issue tokens.

- `POST /api/v1/auth/verify-email`
  - Body: `email`, `code`
  - Consumes a valid verification code, activates the account, marks the email identity verified, and issues an access token plus refresh cookie.

- `POST /api/v1/auth/login`
  - Body: `email`, `password`
  - Authenticates only active and email-verified password users.

- `GET /api/v1/auth/google/start`
  - Redirects to Google's OAuth consent URL.

- `GET /api/v1/auth/google/callback`
  - Receives `code`, exchanges it for Google profile data, links or creates the user, then redirects to the configured success or failure URL.

- `POST /api/v1/auth/refresh`
  - Reads a refresh token from the HttpOnly cookie or request body, rotates it, and returns a new access token.

- `POST /api/v1/auth/logout`
  - Reads a refresh token from the HttpOnly cookie or request body and revokes it.

- `GET /api/v1/auth/me`
  - Requires bearer access token and returns the current user's public profile.

## Data Model

`users`

- `id`
- `email`
- `emailVerified`
- `displayName`
- `avatarUrl`
- `passwordHash`
- `status`
- `createdAt`
- `updatedAt`

`auth_identities`

- `id`
- `userId`
- `provider`
- `providerUserId`
- `providerEmail`
- `providerEmailVerified`
- `metadata`
- `createdAt`
- `updatedAt`

`auth_refresh_tokens`

- `id`
- `userId`
- `tokenHash`
- `expiresAt`
- `revokedAt`
- `replacedByTokenId`
- `userAgent`
- `ipAddress`
- `createdAt`
- `updatedAt`

`auth_email_verifications`

- `id`
- `userId`
- `email`
- `codeHash`
- `expiresAt`
- `consumedAt`
- `invalidatedAt`
- `createdAt`

`outbox_events`

- `id`
- `aggregateType`
- `aggregateId`
- `type`
- `payload`
- `status`
- `processedAt`
- `createdAt`

Required uniqueness:

- `users.email`
- `auth_identities(provider, providerUserId)`
- `auth_identities(userId, provider)`
- `auth_refresh_tokens.tokenHash`

## Error Handling

Email/password registration returns conflict when the email already belongs to an active or verified account. Email/password login returns `InvalidCredentialsException` for missing user, missing password, unverified account, inactive account, or invalid password. Email verification returns the same exception for invalid, expired, consumed, or invalidated codes. Refresh returns the same exception for missing, unknown, expired, or revoked tokens. OAuth callback redirects to `AUTH_FAILURE_REDIRECT_URL` when Google rejects the code, when profile email is missing, or when account linking violates a uniqueness constraint.

## Testing

Unit tests cover:

- Email/password registration creates one pending user, email identity, verification record, and outbox event.
- Re-registering a pending email overwrites the pending password and invalidates old verification codes.
- Pending email/password users cannot log in before verification.
- Email verification activates the account and issues a session.
- Google login links to an existing email/password user by normalized email.
- Password registration is rejected once the normalized email belongs to an active or verified Google-linked account.
- Login rejects users without a password and rejects wrong passwords.
- Refresh token rotation revokes the old token and rejects reuse.
- Logout revokes the current refresh token.
