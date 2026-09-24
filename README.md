# API Gateway

This NestJS service is the client-facing API Gateway for the stream
microservice system.

## Runtime Model

Client traffic enters through HTTP. Gateway modules validate requests,
authenticate callers, and publish Kafka command envelopes to business services.
Business services own domain rules, persistence, and service-to-service events.

The gateway keeps operational HTTP endpoints for deployment checks:

```text
GET /api/health/live
GET /api/health/ready
```

The gateway is available locally at `http://localhost:3000`.

## Kafka Conventions

- `stream.commands`: commands such as `stream.create`
- `stream.events`: facts published by business services
- `stream.commands.reply`: Nest Kafka request/reply results for synchronous
  gateway responses

Commands represent work another service should perform. Events represent facts
that already happened. The reply topic is derived from the command topic by
Nest's Kafka client when `ClientKafka.send()` is used.

## Command Envelope

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

## Local Development

```powershell
pnpm install
Copy-Item .env.example .env
pnpm start:dev
```

Required local environment:

```env
APP_NAME=api-gateway
APP_PORT=3000
NODE_ENV=development
KAFKA_BROKERS=localhost:9094
KAFKA_CLIENT_ID=api-gateway
KAFKA_GROUP_ID=api-gateway
JWT_SECRET=change-this-secret-before-deployment
TOKEN_EXPIRATION=1000d
```

## Docker

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f api-gateway
docker compose down
```

The local stack contains:

- `api-gateway`: NestJS HTTP gateway
- `kafka`: single-node local broker

## HTTP Contract Example

Create a stream through the gateway:

```http
POST /api/streams
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "title": "Launch stream",
  "description": "Demo"
}
```

The gateway validates the request, verifies the JWT, and sends a
`stream.create` command to Kafka.

## Project Structure

```text
src/
|-- main.ts
|-- app.module.ts
|-- app.controller.ts
|-- debug.controller.ts
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

## Adding Gateway Endpoints

1. Add an HTTP request DTO under the target module's `presentation/http/dto`
   path.
2. Add a use case that builds a Kafka command envelope.
3. Inject `KafkaGatewayService` into the use case.
4. Keep domain rules and persistence inside the downstream business service.
5. Add controller, use-case, and E2E coverage for the gateway behavior.

## Testing And Quality

```bash
pnpm test -- --runInBand
pnpm test:e2e -- --runInBand
pnpm lint
pnpm build
```
