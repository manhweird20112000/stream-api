# Clean Architecture Structure Design

## Goal

Refactor the API into a feature-first modular monolith that follows the Clean
Architecture dependency rule. Business and application code must remain
independent from NestJS, MikroORM, HTTP, filesystem, and image-processing
details.

The first migration target is the existing `files` module. The same structure
will be the reference for future feature modules.

## Architectural Rules

Dependencies point inward:

```text
Presentation --------> Application --------> Domain
Infrastructure ------> Application --------> Domain
```

- `domain` contains business models, value objects, and domain errors. It does
  not import framework or infrastructure packages.
- `application` implements use cases and declares ports required by those use
  cases. It may depend only on domain and framework-neutral shared code.
- `infrastructure` implements application ports using MikroORM, filesystem,
  Sharp, or external services.
- `presentation` handles HTTP, authentication, request validation, and response
  mapping using NestJS.
- The NestJS module is the composition root. It binds application ports to
  infrastructure adapters.
- Imports from an inner layer to an outer layer are prohibited.

## Target Structure

```text
src/
|-- main.ts
|-- app.module.ts
|
|-- modules/
|   |-- index.ts
|   `-- files/
|       |-- domain/
|       |   |-- entities/
|       |   |   `-- stored-file.ts
|       |   |-- value-objects/
|       |   |   `-- file-visibility.ts
|       |   |-- repositories/
|       |   |   `-- stored-file.repository.ts
|       |   `-- errors/
|       |       `-- file-not-found.error.ts
|       |
|       |-- application/
|       |   |-- use-cases/
|       |   |   |-- upload-file.use-case.ts
|       |   |   `-- get-private-file.use-case.ts
|       |   |-- ports/
|       |   |   `-- file-storage.port.ts
|       |   `-- dto/
|       |       |-- upload-file.input.ts
|       |       `-- file.output.ts
|       |
|       |-- infrastructure/
|       |   |-- persistence/
|       |   |   |-- entities/
|       |   |   |   `-- stored-file.orm-entity.ts
|       |   |   |-- repositories/
|       |   |   |   `-- mikro-stored-file.repository.ts
|       |   |   |-- mappers/
|       |   |   |   `-- stored-file.mapper.ts
|       |   |   `-- migrations/
|       |   |       `-- Migration20260922000000.ts
|       |   `-- storage/
|       |       `-- local-file-storage.adapter.ts
|       |
|       |-- presentation/
|       |   |-- http/
|       |   |   |-- file.controller.ts
|       |   |   |-- dto/
|       |   |   |   `-- upload-file.request.ts
|       |   |   `-- guards/
|       |   |       `-- jwt-auth.guard.ts
|       |   `-- presenters/
|       |       `-- file.presenter.ts
|       |
|       `-- files.module.ts
|
|-- infrastructure/
|   |-- config/
|   |   |-- database.config.ts
|   |   `-- logger.config.ts
|   |-- database/
|   |   `-- database.module.ts
|   `-- config-service/
|       |-- configuration.port.ts
|       |-- environment-configuration.service.ts
|       `-- configuration.module.ts
|
`-- shared/
    |-- domain/
    |   `-- value-objects/
    |-- application/
    |   `-- base-use-case.ts
    `-- presentation/
        |-- filters/
        |-- interceptors/
        |-- pagination/
        `-- validation/
```

Empty directories will not be created. A directory is introduced only when it
contains code required by the current behavior.

## Files Module Responsibilities

### Domain

- `StoredFile` represents stored-file metadata without ORM decorators.
- `FileVisibility` validates and represents `public` or `private` visibility.
- The repository contract defines persistence operations in domain terms.
- Domain errors describe missing or inaccessible files without HTTP status
  codes.

### Application

- `UploadFileUseCase` coordinates storage and metadata persistence. If database
  persistence fails after a file is written, it removes the written file.
- `GetPrivateFileUseCase` verifies ownership and visibility, then returns a
  framework-neutral file result.
- `FileStoragePort` abstracts file writes, reads, metadata lookup, and cleanup.
- Application DTOs are plain TypeScript types without validation decorators.

### Infrastructure

- The MikroORM entity describes the database table only.
- The repository adapter maps between ORM and domain entities.
- The local storage adapter owns path validation, Sharp conversion, filesystem
  access, and cleanup.
- Existing migrations stay under the feature that owns the table.

### Presentation

- The controller validates HTTP input and calls use cases.
- Request DTOs may use `class-validator` and Swagger decorators.
- Guards own HTTP authentication concerns.
- The presenter maps use-case output to the current response shape. It should be
  omitted if mapping remains trivial enough to keep in the controller.

## Request Flow

### Upload

1. The controller validates the multipart request and authenticated user.
2. `UploadFileUseCase` asks `FileStoragePort` to store the image.
3. The use case creates a domain `StoredFile` and saves it through the repository
   contract.
4. On persistence failure, the use case asks the storage port to remove the file.
5. The controller or presenter returns the existing `id`, `visibility`, and
   `url` response.

### Private Download

1. The controller validates the UUID and authenticated user.
2. `GetPrivateFileUseCase` loads metadata through the repository contract.
3. The use case enforces private visibility and ownership.
4. The storage adapter opens the file and returns framework-neutral stream
   metadata.
5. The controller creates the NestJS `StreamableFile` response.

## Error Handling

- Domain and application layers throw framework-neutral errors.
- Presentation maps known errors to HTTP exceptions or responses.
- Unauthorized users receive the same not-found response as missing private
  files to avoid disclosing file existence.
- Storage cleanup remains best-effort after persistence failure and must not hide
  the original persistence error.

## Shared And Global Infrastructure

- Rename top-level `infra` to `infrastructure` for consistent terminology.
- Keep database, logging, and environment configuration outside feature modules
  because they compose the application globally.
- Move HTTP-specific shared code into `shared/presentation`.
- Keep only genuinely reused domain and application primitives in `shared`.
- Do not add CQRS, event sourcing, domain events, or transaction abstractions as
  part of this refactor.

## Testing

- Unit-test each use case using in-memory port implementations or mocks.
- Unit-test domain value objects and access rules without NestJS.
- Integration-test the MikroORM repository and local storage adapter where their
  behavior cannot be proven by unit tests.
- Preserve and run existing controller and E2E tests to verify the public API is
  unchanged.
- Run architecture checks through ESLint import restrictions only after the
  structure is stable; no new dependency is required for the first refactor.

## Compatibility

The refactor must preserve:

- Existing routes and response formats.
- JWT authentication behavior.
- Public and private storage locations.
- Existing MikroORM table and migration history.
- Docker startup and migration behavior.

## README Update

After implementation, rewrite the architecture section of `README.md` to:

- Show the actual resulting tree rather than aspirational directories.
- Explain the dependency rule and composition root.
- Document where new use cases, ports, adapters, and HTTP DTOs belong.
- Distinguish Clean Architecture from DDD and state that DDD patterns are added
  only when domain complexity justifies them.
- Keep Docker, migration, test, and run commands aligned with the repository.
- Reference Robert C. Martin's Clean Architecture and the public NestJS examples
  used during the design review.

## Out Of Scope

- Changing endpoints or business behavior.
- Introducing CQRS, event sourcing, message buses, or microservices.
- Refactoring unrelated feature modules that do not yet exist.
- Replacing MikroORM, PostgreSQL, Sharp, JWT, or NestJS.
