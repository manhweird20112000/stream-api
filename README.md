# Stream API Service

NestJS authentication service for the Stream system. It exposes HTTP endpoints
for email/password auth, Google OAuth, JWT sessions, refresh-token rotation,
profile updates, and local development email delivery.

The shared infrastructure is intentionally reusable for other services:
configuration, logging, validation, exception handling, health checks, JWT auth,
database access, and local email tooling can be kept.

## Runtime Model

Client traffic enters through the API Gateway under `/api`. The API Gateway
publishes Kafka request/response commands to this auth-service. The auth module
owns user registration, email verification, password login, Google OAuth,
refresh-token sessions, and current-user profile data.

Operational endpoints:

```text
GET /api/health/live
GET /api/health/ready
GET /api/docs
```

Local API Gateway URL: `http://localhost:3000`.

## Local Development

```powershell
pnpm install
Copy-Item .env.example .env
pnpm start:dev
```

Required environment:

```env
APP_NAME=auth-service
APP_PORT=3000
NODE_ENV=development
API_GATEWAY_URL=http://localhost:3000
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=auth_service
DATABASE_PASSWORD=auth_service_password
DATABASE_NAME=auth_service
KAFKA_BROKERS=localhost:19094
KAFKA_CLIENT_ID=auth-service
KAFKA_GROUP_ID=auth-service
JWT_SECRET=change-this-secret-before-deployment
TOKEN_EXPIRATION=1000d
```

`APP_PORT` is the internal auth-service port. `API_GATEWAY_URL` is the public
URL used by clients and OAuth redirects. Set `GOOGLE_CALLBACK_URL`,
`AUTH_SUCCESS_REDIRECT_URL`, or `AUTH_FAILURE_REDIRECT_URL` only when they need
to differ from the gateway defaults.

Optional debug route:

```env
ENABLE_DEBUG_ROUTES=true
```

When enabled in development, `GET /api/debug/block-event-loop?durationMs=1000`
can be used to test event-loop blocking behavior.

Local email delivery:

```env
EMAIL_DELIVERY_ENABLED=true
SMTP_HOST=localhost
SMTP_PORT=1025
MAIL_FROM=no-reply@stream.local
```

When using Docker Compose, open Mailpit at `http://localhost:8025` to view
verification emails queued by `POST /api/v1/auth/register`. Registration writes
an outbox event in the same database transaction; a background worker sends
pending email events and leaves failed events pending for retry.

## Docker

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f auth-service
docker compose down
```

The local stack contains:

- `auth-service`: Kafka auth consumer with HTTP health/docs on `http://localhost:13001`
- `postgres`: local PostgreSQL database
- `mailpit`: local SMTP inbox for development email

Kafka and Kong are deployed from the root stack. This service joins the shared
`stream-net` Docker network and uses `KAFKA_BROKERS=kafka:9092` in Docker.

## Kafka Commands

The API Gateway should use Nest `ClientKafkaProxy.send()` with these topics:

```text
auth.register
auth.verify_email
auth.login
auth.refresh
auth.logout
auth.me
auth.update_me
auth.google_start
auth.google_callback
```

For request/response topics, the gateway must call `subscribeToResponseOf()`
before `connect()` for every topic it sends.

## PM2 Production

Build first, then run the compiled service through PM2:

```bash
pnpm build
pnpm pm2:start
```

The PM2 ecosystem config runs `dist/main.js` in cluster mode with one instance:

```text
exec_mode: cluster
instances: 1
TZ: Asia/Bangkok
```

Useful commands:

```bash
pnpm pm2:status
pnpm pm2:logs
pnpm pm2:reload
pnpm pm2:restart
pnpm pm2:stop
pnpm pm2:delete
```

Install PM2 on the server if it is not already available:

```bash
npm install -g pm2
```

## HTTP Example

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "owner@example.com",
  "password": "secret123"
}
```

The API Gateway validates the HTTP request, sends `auth.login` to Kafka, sets
the returned refresh token as an HttpOnly cookie, and returns the access token
to the client.

## Project Structure

```text
src/
|-- main.ts
|-- app.module.ts
|
|-- infrastructure/
|   |-- config/
|   |-- health/
|   |-- database/
|   `-- secret/
|
|-- modules/
|   |-- index.ts
|   `-- auth/
|       |-- application/
|       |-- domain/
|       |-- infrastructure/
|       |-- presentation/
|       |   `-- http/
|       |       `-- dto/
|       `-- auth.module.ts
|
`-- shared/
    |-- application/
    |-- domain/
    |-- exceptions/
    |-- presentation/
    |   |-- filters/
    |   |-- guards/
    |   |-- interceptors/
    |   |-- pagination/
    |   `-- validation/
    `-- utils/
```

## Reusing For Another Service

Keep the shared infrastructure that service needs. Replace gateway-specific
names, Docker service names, env values, and feature modules.

For a business service, add that service's domain, persistence, repositories,
and HTTP or worker entry points there instead of keeping auth-specific modules.

## Quality Checks

```bash
pnpm test --runInBand
pnpm test:e2e --runInBand
pnpm lint
pnpm build
```
