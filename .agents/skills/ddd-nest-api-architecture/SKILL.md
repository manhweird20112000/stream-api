---
name: ddd-nest-api-architecture
description: Guidelines and patterns for the DDD-based NestJS API architecture used in this project.
license: MIT
metadata:
  author: Antigravity
  version: "1.0.0"
---

# DDD NestJS API Architecture

This skill defines the architectural standards, directory structure, and coding patterns for this codebase. It is based on Domain-Driven Design (DDD) and Clean Architecture principles.

## Core Architectural Layers

Each module in `src/modules/` follows a strict layered structure:

### 1. Domain Layer (`domain/`)
- **Responsibility**: Pure business logic. No dependencies on external frameworks or infrastructure.
- **Contents**:
    - **Entities**: Objects with identity and business logic.
    - **Value Objects**: Immutable objects defined by their attributes.
    - **Aggregate Roots**: Entry points to a cluster of related entities.
    - **Domain Services**: Logic that doesn't belong to a specific entity.
    - **Repository Interfaces**: Abstract definitions of data persistence.

### 2. Application Layer (`application/`)
- **Responsibility**: Orchestrates domain objects to fulfill use cases.
- **Contents**:
    - **Use Cases**: Implements `BaseUseCase<Input, Output>`. Orchestrates the flow.
    - **Ports (Interfaces)**: Defines contracts for infrastructure (e.g., `IJwtService`, `IAdminRepository`).
    - **DTOs**: Data Transfer Objects for input validation (using `class-validator`).

### 3. Infrastructure Layer (`infrastructure/`)
- **Responsibility**: Implementation of technical details (Adapters).
- **Contents**:
    - **Repositories**: Concrete implementations using TypeORM, Prisma, etc.
    - **External Adapters**: Implementations of ports (e.g., `JwtAdapter`, `S3Adapter`).
    - **Mappers**: Convert between Domain Entities and Persistence Models.

### 4. Interface Layer (`interface/`)
- **Responsibility**: Entry points for the application (Controllers, Guards, Resolvers).
- **Contents**:
    - **Controllers**: NestJS controllers handling HTTP requests.
    - **Guards**: Authentication and Authorization logic.
    - **Pipes/Filters**: Input transformation and exception handling.

---

## Coding Standards & Patterns

### 1. Use Case Implementation
All use cases must extend `BaseUseCase` and be decorated with `@Injectable()`.

```typescript
@Injectable()
export class MyUseCase implements BaseUseCase<Input, Output> {
  constructor(
    private readonly myPort: IMyPort, // Inject port, not implementation
  ) {}

  async execute(input: Input): Promise<Output> {
    // 1. Get domain objects via ports
    // 2. Perform business logic
    // 3. Save changes via ports
    // 4. Return output
  }
}
```

### 2. Dependency Injection
- Use **Interface-based DI** (using abstract classes as tokens).
- Define the interface (abstract class) in `application/ports`.
- Implement it in `infrastructure/`.
- Register the provider in the module: `{ provide: IMyPort, useClass: MyAdapter }`.

### 3. Error Handling
- Throw domain-specific or shared exceptions (e.g., `InvalidCredentialsException`).
- Use NestJS Exception Filters to map these to HTTP responses.

### 4. Testing Strategy
- **Unit Tests**: Mandatory for Use Cases and Domain Services. Mock all ports.
- **Integration Tests**: For Infrastructure Adapters and Controllers.

---

## Directory Structure Reference

```
src/
├── infra/              # Global infrastructure (database config, etc.)
├── modules/            # Feature modules
│   └── [module-name]/
│       ├── domain/
│       ├── application/
│       │   ├── use-cases/
│       │   ├── ports/
│       │   └── dtos/
│       ├── infrastructure/
│       │   ├── persistence/
│       │   └── external/
│       └── interface/
│           ├── controllers/
│           └── guards/
└── shared/             # Shared kernel (BaseEntity, BaseUseCase, etc.)
```
