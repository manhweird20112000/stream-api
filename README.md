# Stream API Service

NestJS service base for the Stream system. This repository currently runs as
the client-facing HTTP API Gateway: it validates HTTP requests, authenticates
callers, and sends business commands to downstream services through Kafka.

The shared infrastructure is intentionally reusable for other services:
configuration, logging, validation, exception handling, health checks, JWT auth,
and Kafka integration can be kept. Gateway-specific modules should be renamed
or removed when this codebase is used for a business service.

## Runtime Model

Client traffic enters through HTTP under `/api`. Gateway modules handle request
validation and authentication, then publish Kafka command envelopes to business
services. Business services own domain rules, persistence, and service-to-service
events.

Operational endpoints:

```text
GET /api/health/live
GET /api/health/ready
GET /api/docs
```

Auth gateway endpoints:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET /api/auth/me
```

Local direct Docker URL: `http://localhost:13000`.
Local Kong proxy URL: `http://localhost:8000`.

## Local Development

```powershell
pnpm install
Copy-Item .env.example .env
pnpm start:dev
```

Required environment:

```env
APP_NAME=api-gateway
APP_PORT=3000
NODE_ENV=development
KAFKA_BROKERS=localhost:19094
KAFKA_CLIENT_ID=api-gateway
KAFKA_GROUP_ID=api-gateway
JWT_SECRET=change-this-secret-before-deployment
TOKEN_EXPIRATION=1000d
```

Optional debug route:

```env
ENABLE_DEBUG_ROUTES=true
```

When enabled in development, `GET /api/debug/block-event-loop?durationMs=1000`
can be used to test event-loop blocking behavior.

## Docker

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f kong
docker compose logs -f api-gateway
docker compose down
```

Production containers start with `pnpm start:cluster`, which runs
`pm2-runtime ecosystem.config.cjs` in cluster mode with `instances: max`.

The local stack contains:

- `kong`: DB-less edge proxy for local traffic on `http://localhost:8000`
- `api-gateway`: NestJS HTTP API Gateway running with PM2 cluster mode (`instances: max`)
- `kafka`: single-node local broker

## Kafka Conventions

- `auth.commands`: commands such as `auth.login`
- `auth.events`: facts published by the auth service
- `auth.commands.reply`: Nest Kafka request/reply results for synchronous
  auth HTTP responses
- `stream.commands`: commands such as `stream.create`
- `stream.events`: facts published by business services
- `stream.commands.reply`: Nest Kafka request/reply results for synchronous
  HTTP responses

Local Kafka auto-creates topics with 16 partitions so Nest Kafka
request/reply works with the PM2 cluster. In production, create every
`*.commands.reply` topic with at least as many partitions as running gateway
processes.

Example command envelope:

```json
{
  "requestId": "req-123",
  "userId": "user-1",
  "type": "stream.create",
  "payload": {
    "title": "Launch stream"
  }
}
```

## HTTP Example

```http
POST /api/streams
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "title": "Launch stream",
  "description": "Demo"
}
```

The service validates the request, verifies the JWT, and sends a
`stream.create` command to Kafka.

## Project Structure

```text
src/
|-- main.ts
|-- app.module.ts
|
|-- infrastructure/
|   |-- config/
|   |-- health/
|   |-- kafka/
|   `-- secret/
|
|-- modules/
|   |-- index.ts
|   `-- streams/
|       |-- application/
|       |   |-- dto/
|       |   `-- use-cases/
|       |-- presentation/
|       |   `-- http/
|       |       `-- dto/
|       `-- streams.module.ts
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

For a business service, add the service's domain, persistence, repositories, and
Kafka consumers there instead of keeping the API Gateway contract module.

## Quality Checks

```bash
pnpm test --runInBand
pnpm test:e2e --runInBand
pnpm lint
pnpm build
```
