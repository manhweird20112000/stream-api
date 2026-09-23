# NestJS Clean Architecture API

A NestJS API template organized as a feature-first modular monolith. The
project applies Clean Architecture boundaries where they protect application
logic, without adding CQRS, event sourcing, or speculative abstractions.

## Stack

- Node.js 24+
- pnpm 11
- NestJS 11
- MikroORM 7
- PostgreSQL 16 with PostGIS 3.5
- Jest and Supertest
- Docker Compose

## Quick Start

### Docker

Start the API, database, and one-shot migration service:

```bash
docker compose up -d --build
```

Check service status:

```bash
docker compose ps -a
```

Expected state:

- `postgres`: healthy
- `api`: healthy
- `migrator`: `Exited (0)` after applying migrations successfully

The API is available at `http://localhost:3000`.

```bash
docker compose logs -f api
docker compose run --rm migrator
docker compose down
```

The database uses `postgis/postgis:16-3.5-alpine` because the persisted volume
contains PostGIS extensions. `docker compose down` keeps the database volume;
use `docker compose down -v` only when intentionally deleting local data.

### Local Development

```powershell
pnpm install
Copy-Item .env.example .env
pnpm migration:up
pnpm start:dev
```

## Project Structure

The repository is organized by feature first, then by architectural layer:

```text
src/
|-- main.ts
|-- app.module.ts
|-- app.controller.ts
|-- debug.controller.ts
|
|-- modules/
|   |-- index.ts
|   `-- files/
|       |-- domain/
|       |   |-- entities/
|       |   |-- errors/
|       |   |-- repositories/
|       |   `-- value-objects/
|       |-- application/
|       |   |-- dto/
|       |   |-- ports/
|       |   `-- use-cases/
|       |-- infrastructure/
|       |   |-- persistence/
|       |   |   |-- entities/
|       |   |   |-- mappers/
|       |   |   |-- migrations/
|       |   |   `-- repositories/
|       |   `-- storage/
|       |-- presentation/
|       |   `-- http/
|       |       |-- dto/
|       |       `-- guards/
|       `-- files.module.ts
|
|-- infrastructure/
|   |-- config/
|   |-- database/
|   `-- secret/
|
`-- shared/
    |-- application/
    |-- domain/
    |-- exceptions/
    |-- presentation/
    |   |-- filters/
    |   |-- interceptors/
    |   |-- pagination/
    |   `-- validation/
    `-- utils/
```

Only directories required by current behavior are created. New modules should
not add empty layers or abstractions in anticipation of future needs.

## Architecture

### Dependency Rule

Dependencies point toward the business rules:

```text
Presentation --------> Application --------> Domain
Infrastructure ------> Application --------> Domain
```

| Layer | Responsibility | Allowed dependencies |
| --- | --- | --- |
| Domain | Entities, value objects, business errors, repository contracts | Framework-neutral code |
| Application | Use cases, input/output types, outbound ports | Domain and framework-neutral shared code |
| Infrastructure | MikroORM repositories, persistence mapping, filesystem, Sharp, external services | Application and Domain |
| Presentation | NestJS controllers, guards, request validation, HTTP mapping | Application and Domain |

The following imports are prohibited inside `domain` and `application`:

- `@nestjs/*`
- `@mikro-orm/*`
- Express request or response types
- `node:fs` and `node:path`
- Sharp or other infrastructure SDKs

Framework-neutral Node.js types such as `Buffer` and `Readable` are allowed at
application boundaries.

### Composition Root

Each feature's NestJS module is its composition root. For example,
`files.module.ts` registers the ORM entity, binds repository and storage ports
to adapters, constructs use cases, and exposes the HTTP controller. Concrete
adapters must not be imported by use cases or domain objects.

### DTO Boundaries

HTTP request DTOs belong in `presentation/http/dto` and may use
`class-validator`, Swagger, or NestJS decorators. Application input/output
types belong in `application/dto` and remain plain TypeScript.

### Clean Architecture And DDD

Clean Architecture controls dependency direction. DDD models business concepts
when a feature has meaningful invariants or state transitions. They are related
but not interchangeable.

Start a simple feature with presentation, application, and infrastructure.
Introduce domain entities, value objects, services, or aggregates only when the
business rules justify them. Do not add CQRS, event sourcing, domain events, or
a transaction abstraction solely for structural consistency.

## Files Feature

```text
FileController
    |
    +--> UploadFileUseCase
    |       +--> StoredFileRepository <-- MikroORM adapter
    |       `--> FileStoragePort       <-- Local filesystem adapter
    |
    `--> GetPrivateFileUseCase
            +--> StoredFileRepository
            `--> FileStoragePort
```

Public files are served from `/assets`. Private files require a valid JWT and
are returned only to their owner. Missing, public, and foreign private files all
produce the same not-found response to avoid revealing private metadata.

| Method | Route | Authentication | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/files` | Bearer JWT | Upload a PNG or JPEG as public or private |
| `GET` | `/api/files/:id` | Bearer JWT | Read a private image owned by the caller |

Uploads are limited to 1 MiB and stored as WebP. If metadata persistence fails,
the use case attempts to remove the written file before returning the original
persistence error.

## Configuration

Copy `.env.example` to `.env` for local development. Docker Compose supplies
container-specific values and connects the API to `postgres` by hostname.

```env
APP_NAME=LOCAL
APP_PORT=3000
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ddd_nest_api
DB_SYNC=false
JWT_SECRET=local-secret
TOKEN_EXPIRATION=1000d
```

## Database Migrations

NestJS configuration lives in
`src/infrastructure/config/database.config.ts`. MikroORM CLI configuration lives
in `mikro-orm.config.js`.

```text
src/modules/*/infrastructure/persistence/entities/**/*.orm-entity.ts
src/modules/*/infrastructure/persistence/migrations/**/*.ts
```

```bash
pnpm migration:up
pnpm migration:down
pnpm migration:create files add_column_name
```

In Docker, migrations run before the API through the one-shot `migrator`
service.

## Testing And Quality

```bash
pnpm test --runInBand
pnpm test:e2e --runInBand
pnpm build
pnpm lint
pnpm format
```

Tests are colocated with domain, use-case, adapter, guard, and shared code.
Application E2E tests live under `test/`.

## Adding A Feature

1. Start with the HTTP contract and a use-case test.
2. Define domain types only for real business rules.
3. Define repository or external-service contracts in an inner layer.
4. Implement those contracts under the feature's `infrastructure` directory.
5. Keep request validation and HTTP error mapping in `presentation`.
6. Bind ports to adapters in the feature module.
7. Add E2E coverage for externally visible behavior.

## References

- [Clean Architecture: A Craftsman's Guide to Software Structure and Design](https://github.com/GunterMueller/Books-3/blob/master/Clean%20Architecture%20A%20Craftsman%20Guide%20to%20Software%20Structure%20and%20Design.pdf)
- [Sairyss: Domain-Driven Hexagon](https://github.com/Sairyss/domain-driven-hexagon)
- [Andrea Acampora: NestJS DDD DevOps](https://github.com/andrea-acampora/nestjs-ddd-devops)
- [oNo500: NestJS Boilerplate Architecture](https://github.com/oNo500/nestjs-boilerplate/blob/master/docs/architecture.md)
- [Bitloops: DDD, Hexagonal, CQRS, ES, EDA](https://github.com/bitloops/ddd-hexagonal-cqrs-es-eda)
- [MikroORM NestJS RealWorld Example](https://github.com/mikro-orm/nestjs-realworld-example-app)

The external repositories are references, not templates copied wholesale. This
project intentionally uses the smallest set of patterns needed by its current
behavior.
