# Auth Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build backend auth for email/password and Google OAuth with refresh-token sessions while keeping one user account across multiple providers.

**Architecture:** Add an `auth` feature module with domain ports, application use cases, infrastructure adapters, and a controller exposing versioned auth routes. Keep provider scaling in `auth_identities` instead of adding provider columns to `users`.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, Jest, bcrypt, Nest JWT, Node fetch.

**Spec:** `docs/superpowers/specs/2026-09-25-auth-service-design.md`

## Global Constraints

- No provider-specific columns on `users`.
- Do not add a dependency unless the standard platform or an existing dependency cannot do the job.
- Route prefix is `/api` from `main.ts`; auth controller uses URI version `1`.
- Database sync remains disabled; provide a migration class for schema creation.
- Refresh tokens are stored only as hashes and rotated on every refresh.
- Application use cases do not import TypeORM, persistence entities, Nest JWT, or Node crypto.

## Review Focus

- Existing Google user later adds password with the same normalized email.
- Existing email/password user later logs in with Google using the same verified email.
- Wrong password and missing password both produce invalid credentials.
- Provider identity uniqueness prevents one Google identity from binding to multiple users.
- Provider enum is easy to extend without changing user schema.
- Refresh-token reuse after rotation returns invalid credentials.
- Logout revokes the active refresh token.

---

### Task 1: Auth Domain and Persistence

**Files:**
- Create: `src/modules/auth/domain/auth-provider.ts`
- Create: `src/modules/auth/infrastructure/persistence/user.entity.ts`
- Create: `src/modules/auth/infrastructure/persistence/auth-identity.entity.ts`
- Create: `src/modules/auth/infrastructure/persistence/auth-refresh-token.entity.ts`
- Create: `src/infrastructure/database/migrations/20260925000000-create-auth-tables.ts`

**Interfaces:**
- Produces: `AuthProvider`, `UserEntity`, `AuthIdentityEntity`, `AuthRefreshTokenEntity`

- [ ] Write failing tests through auth service behavior.
- [ ] Add entities and migration with multi-provider uniqueness.
- [ ] Run auth tests.

### Task 2: Auth Application Service

**Files:**
- Create: `src/modules/auth/application/auth.service.ts`
- Create: `src/modules/auth/application/auth.service.spec.ts`

**Interfaces:**
- Consumes: `AuthProvider`, `UserEntity`, `AuthIdentityEntity`
- Produces: `AuthService.registerWithPassword`, `AuthService.loginWithPassword`, `AuthService.loginWithProvider`

- [ ] Write failing tests for register, login, Google link, and password link.
- [ ] Implement minimal account linking logic.
- [ ] Run auth tests.

### Task 3: Google OAuth and HTTP API

**Files:**
- Create: `src/modules/auth/infrastructure/google-oauth.client.ts`
- Create: `src/modules/auth/presentation/http/auth.controller.ts`
- Create: `src/modules/auth/presentation/http/dto/login.request.ts`
- Create: `src/modules/auth/presentation/http/dto/register.request.ts`
- Create: `src/modules/auth/auth.module.ts`
- Modify: `src/modules/index.ts`
- Modify: `src/infrastructure/secret/adapter.ts`
- Modify: `src/infrastructure/secret/service.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `AuthService`
- Produces: `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/google/start`, `/api/v1/auth/google/callback`

- [ ] Add DTO validation.
- [ ] Add Google OAuth client using backend code exchange.
- [ ] Add controller and module wiring.
- [ ] Run unit tests, lint, and build.

### Task 4: Refresh Token Sessions

**Files:**
- Create: `src/modules/auth/infrastructure/persistence/auth-refresh-token.entity.ts`
- Modify: `src/modules/auth/application/auth.service.ts`
- Modify: `src/modules/auth/application/auth.service.spec.ts`
- Modify: `src/modules/auth/presentation/http/auth.controller.ts`
- Modify: `src/modules/auth/presentation/http/auth.controller.spec.ts`
- Modify: `src/modules/auth/auth.module.ts`
- Modify: `src/infrastructure/database/migrations/20260925000000-create-auth-tables.ts`
- Modify: `src/infrastructure/secret/adapter.ts`
- Modify: `src/infrastructure/secret/service.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: existing login/register/provider login flows
- Produces: `AuthService.refreshSession`, `AuthService.logout`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`

- [ ] Write failing tests for token hash storage, rotation, reuse rejection, and logout revoke.
- [ ] Implement refresh token entity and schema.
- [ ] Implement service rotation/revoke logic.
- [ ] Add controller cookie handling.
- [ ] Run unit tests, e2e, lint, and build.
