# NestJS API Template

A NestJS API template following **Clean Architecture**: clear separation of concerns, dependency inversion, and maintainability without over-engineering.

## 🚀 Features

### Core Features

- **Clean Architecture**
  - **Domain** – entities, value objects, repository ports (no outer dependencies)
  - **Application** – use cases, DTOs, ports (depends only on domain)
  - **Interface** – controllers, presenters (depends on application)
  - **Infrastructure** – repository implementations, ORM, external adapters (implements ports)
  - Dependency rule: inner layers do not depend on outer layers; dependencies point inward
- **TypeScript** for type safety
  - Strict type checking
  - Explicit types for parameters and return values
  - JSDoc for public APIs

### Technical Stack

- **NestJS** framework
  - Modular architecture
  - Dependency injection (ports bound to adapters in module)
  - Guards and interceptors
- **MikroORM** for persistence
  - Entity relationships
  - Migrations
  - Unit of Work and transactions
- **PostgreSQL** as primary database
- **JWT** authentication
  - Token-based auth
  - Guards and decorators for current user
- **Swagger** (OpenAPI) for API documentation
- **Winston** for logging

### Development Tools

- **Jest** testing framework
  - Unit testing
  - Integration testing
  - E2E testing
  - Code coverage
- **ESLint** & **Prettier** for code quality
  - Code style enforcement
  - Best practices checking
  - Automatic formatting
- **Docker** support
  - Development environment
  - Production deployment
  - Multi-stage builds

## 📋 Prerequisites

### Required Software

- Node.js (v24 or higher)
  - Recommended: v24 LTS
  - pnpm package manager
- PostgreSQL database
  - Version 12 or higher (used with MikroORM)
- Docker (optional)
  - Docker Engine 20.10+
  - Docker Compose 2.0+

### Development Environment

- Git for version control
- VS Code (recommended) or your preferred IDE
- Postman or similar API testing tool
- PostgreSQL client (e.g. pgAdmin, DBeaver) for database management

## 🛠 Installation

1. Clone the repository:

```bash
git clone [repository-url]
cd ddd-nest-api
```

2. Install dependencies:

```bash
pnpm install
```

3. Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

4. Update the environment variables in `.env` file with your configuration:

```env
# Application
APP_NAME=my-app
APP_PORT=3000

# Database (PostgreSQL)
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-password
DB_NAME=ddd_nest_api

# JWT
JWT_SECRET=your-secret-key
TOKEN_EXPIRATION=7d

# Logging (optional)
LOG_LEVEL=debug
```

5. Start the development server:

```bash
pnpm start:dev
```

## 🏗 Project Structure (Clean Architecture)

Each **module** is organized into four layers. Dependencies point **inward**: Infrastructure and Interface depend on Application and Domain; Domain has no dependencies on other layers.

```
src/
├── modules/                                  # Feature modules
│   └── [module-name]/                        # e.g. order, user, catalog
│       ├── domain/                           # DOMAIN LAYER (innermost)
│       │   ├── entities/                     # Domain entities
│       │   ├── value-objects/                # Module-specific value objects
│       │   └── repositories/                 # Repository ports (abstract interfaces only)
│       ├── application/                      # APPLICATION LAYER (use cases)
│       │   ├── use-cases/                    # One use case per application action
│       │   ├── dtos/                         # Input DTOs (validation at boundary)
│       │   └── ports/                        # Port interfaces (repository, external service)
│       ├── interface/                        # INTERFACE LAYER (presentation)
│       │   ├── controllers/                  # HTTP entrypoints → call use cases
│       │   ├── presenters/                   # Domain/output → API response shape
│       │   ├── guards/                       # Auth, authorization
│       │   └── decorators/                   # Route/request decorators
│       └── infrastructure/                   # INFRASTRUCTURE LAYER (adapters)
│           ├── persistence/                  # Persistence
│           │   ├── entities/                 # ORM entities (DB schema)
│           │   ├── repositories/             # Repository implementations
│           │   ├── mappers/                  # Domain entity ↔ ORM entity
│           │   ├── migrations/               # DB migrations
│           │   └── seeders/                  # Seed data
│           └── external/                     # External service adapters (HTTP, cache, etc.)
├── shared/                                   # Cross-cutting
│   ├── domain/                               # Shared domain (value objects, e.g. Password, Money)
│   │   └── value-objects/
│   ├── common/                               # Base use case, shared interfaces
│   ├── filters/                              # Global exception filters
│   ├── guards/                               # Global guards
│   ├── interceptors/                         # HTTP interceptors
│   ├── pipes/                                # Validation pipes (class-validator)
│   ├── decorators/                           # Shared decorators
│   ├── exceptions/                           # Shared exception classes
│   ├── constants/                           # Shared constants
│   └── utils/                                # Pure utility functions
├── infra/                                    # Global infrastructure
│   ├── config/                               # App config (database, logger, env)
│   ├── database/                             # MikroORM module wiring
│   ├── secret/                               # Secrets adapter (env)
│   └── logging/                              # Logger adapter
├── app.module.ts
└── main.ts                                   # Application entry point
```

## 🚀 Running the Application

### Development

```bash
# Start development server with hot-reload
pnpm start:dev

# Start with debug mode
pnpm start:debug

# Start with SWC compiler (faster)
pnpm start:swc
```

### Production

```bash
# Build the application
pnpm build

# Start production server
pnpm start:prod
```

### Docker

```bash
# Build and start containers
docker compose up -d --build

# View logs
docker compose logs -f api

# Run migrations manually
docker compose exec api pnpm migration:up

# Stop containers
docker compose down
```

## 📝 API Documentation

### Swagger UI

Once the application is running, access the Swagger documentation at:

```
http://localhost:3000/api
```

### API Versioning

The API supports versioning through the URL path:

```
http://localhost:3000/api/v1/[resource]
```

### Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 🧪 Testing

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov
```

### E2E Tests

```bash
# Run all e2e tests
pnpm test:e2e

# Run specific e2e test file
pnpm test:e2e --testPathPattern=auth.e2e-spec.ts
```

### Test Structure

```
test/
├── unit/              # Unit tests
├── integration/       # Integration tests
└── e2e/              # End-to-end tests
```

## 📦 Database Migrations

Migrations and ORM config are configured in `src/infra/config/database.config.ts` for NestJS and `mikro-orm.config.js` for the MikroORM CLI. Entity and migration paths follow the module structure: `modules/*/infrastructure/persistence/`.

### Running Migrations

```bash
# Build first (migrations run from dist)
pnpm build

# Run all pending migrations
pnpm migration:up

# Revert last migration
pnpm migration:down

# Run seeders
pnpm seed:run <module> <seederFile>
```

## 🔧 Code Quality

### Linting

```bash
# Run linter
pnpm lint

# Fix linting issues automatically
pnpm lint:fix
```

### Formatting

```bash
# Format code
pnpm format
```

### Pre-commit Hooks

The project includes pre-commit hooks for:

- Linting
- Formatting
- Type checking
- Test running

## 📚 Clean Architecture

### Dependency Rule

- **Domain** and **Application** define **ports** (interfaces/abstract classes).
- **Infrastructure** and **Interface** implement or use those ports (adapters).
- Dependencies point **inward**: Interface and Infra → Application → Domain. Domain does not depend on any other layer.

### Domain Layer

- **Entities**: core business objects (e.g. `Admin`, `Role`).
- **Value objects**: immutable values (e.g. `AdminStatusVO` in module; `PasswordVO`, `MoneyVO` in `shared/domain`).
- **Repositories**: abstract ports (e.g. `AdminRepository`) for persistence; no implementation here.
- No imports from `application`, `interface`, or `infra`; no framework or DB types.

### Application Layer (Use Cases)

- **Use cases**: one class per application action (e.g. `CreateAdminUseCase`, `ListAdminUseCase`); each implements `execute(input) → output`.
- **DTOs**: input validation (e.g. with `class-validator`) and transfer objects.
- **Ports**: interfaces for secondary actors (e.g. `AdminQueryPort`, repository abstractions used by use cases).
- Orchestrates domain entities and repository ports; contains application logic and transactions, not HTTP or DB details.

### Interface Layer (Presentation / Adapters)

- **Controllers**: HTTP entrypoints; parse request, call use cases, return responses.
- **Presenters**: map domain/output DTOs to API response shapes.
- **Guards, decorators**: auth, current user, etc.
- Depends on Application (use cases, DTOs), not on Infrastructure.

### Infrastructure Layer (Adapters)

- **ORM entities** and **repository implementations**: implement domain repository ports (e.g. `AdminRepositoryImpl`).
- **Mappers**: domain entity ↔ ORM entity.
- **Seeders, migrations**: DB setup.
- **External adapters**: e.g. JWT adapter implementing an application port.
- Implements ports defined in Domain/Application; contains all DB and external service details.

### Wiring in NestJS

Modules bind **ports to adapters** via `providers`: e.g. `{ provide: AdminRepository, useClass: AdminRepositoryImpl }`. Controllers inject use cases; use cases inject repository/port interfaces. The dependency injection container resolves interfaces to the concrete implementations registered in the module.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch:

```bash
git checkout -b feature/amazing-feature
```

3. Commit your changes:

```bash
git commit -m 'Add some amazing feature'
```

4. Push to the branch:

```bash
git push origin feature/amazing-feature
```

5. Open a Pull Request

### Commit Message Convention

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:

- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Adding tests
- chore: Maintenance

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- hs.weird

## 🙏 Acknowledgments

- NestJS team for the framework
- MikroORM for persistence
- All contributors who have helped shape this template

## 📞 Support

For support, please:

1. Check the [documentation](docs/)
2. Search [existing issues](issues)
3. Create a new issue if needed

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes.
