# Clean Architecture Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the existing files feature into the approved Clean Architecture structure without changing its HTTP API, persistence schema, storage behavior, or Docker startup.

**Architecture:** The files feature becomes a vertical module with framework-neutral domain and application layers. NestJS controllers drive use cases, while MikroORM and local filesystem adapters implement inward-facing ports; `files.module.ts` is the composition root.

**Tech Stack:** TypeScript 5.9, NestJS 11, MikroORM 7, PostgreSQL 16/PostGIS 3.5, Sharp, Jest 30, Supertest, pnpm 11.

## Global Constraints

- Preserve `POST /api/files` and `GET /api/files/:id` behavior and response formats.
- Preserve JWT authentication, UUID v7 validation, public/private storage paths, and private-file non-disclosure behavior.
- Preserve the `stored_files` table and existing MikroORM migration history.
- Domain and application code must not import NestJS, MikroORM, Express, filesystem, path, or Sharp.
- Do not add CQRS, event sourcing, message buses, transaction abstractions, or new dependencies.
- Do not create empty directories or speculative abstractions.
- Keep all unrelated working-tree changes intact.

## File Map

### Create

- `src/modules/files/domain/entities/stored-file.ts`: framework-neutral stored-file entity.
- `src/modules/files/domain/value-objects/file-visibility.ts`: visibility type and validation.
- `src/modules/files/domain/repositories/stored-file.repository.ts`: persistence contract.
- `src/modules/files/domain/errors/file-not-found.error.ts`: framework-neutral access error.
- `src/modules/files/application/dto/upload-file.input.ts`: upload input types.
- `src/modules/files/application/dto/file.output.ts`: upload/download output types.
- `src/modules/files/application/ports/file-storage.port.ts`: image storage contract.
- `src/modules/files/application/use-cases/upload-file.use-case.ts`: upload orchestration.
- `src/modules/files/application/use-cases/get-private-file.use-case.ts`: private-file access orchestration.
- `src/modules/files/infrastructure/persistence/entities/stored-file.orm-entity.ts`: MikroORM schema model.
- `src/modules/files/infrastructure/persistence/mappers/stored-file.mapper.ts`: domain/ORM mapping.
- `src/modules/files/infrastructure/persistence/repositories/mikro-stored-file.repository.ts`: MikroORM repository adapter.
- `src/modules/files/infrastructure/storage/local-file-storage.adapter.ts`: Sharp and filesystem adapter.
- `src/modules/files/presentation/http/dto/upload-file.request.ts`: HTTP visibility validation.
- `src/modules/files/presentation/http/file.controller.ts`: HTTP adapter.
- `src/modules/files/presentation/http/guards/jwt-auth.guard.ts`: JWT HTTP guard.

### Move Or Modify

- `src/modules/files/infrastructure/persistence/migrations/Migration20260922000000.ts`: retain migration at the same effective discovery path.
- `src/modules/files/files.module.ts`: bind repository/storage ports to adapters and provide use cases.
- `src/infra/**`: rename to `src/infrastructure/**` and update imports.
- `src/shared/common/base-use-case.ts`: move to `src/shared/application/base-use-case.ts`.
- `src/shared/{filters,interceptors,pagination,validation}/**`: move under `src/shared/presentation/**`.
- `src/main.ts`, `src/app.module.ts`, `src/modules/files/files.module.ts`: update imports after moves.
- `mikro-orm.config.js`: update ORM entity glob for the new entity suffix.
- `src/infrastructure/config/database.config.ts`: update ORM entity glob for the new entity suffix.
- `test/files.e2e-spec.ts`: target the new controller and use-case tokens.
- `README.md`: document actual architecture, commands, and references.

### Remove After Replacement

- `src/modules/files/application/file.service.ts`
- `src/modules/files/application/file-access.ts`
- `src/modules/files/application/file-access.spec.ts`
- `src/modules/files/infrastructure/persistence/entities/stored-file.entity.ts`
- `src/modules/files/interface/file.controller.ts`
- `src/modules/files/interface/jwt-auth.guard.ts`
- `src/modules/files/interface/jwt-auth.guard.spec.ts`
- `src/shared/utils/image.ts`
- `src/shared/utils/image.spec.ts`

---

### Task 1: Introduce The Framework-Neutral Domain

**Files:**
- Create: `src/modules/files/domain/entities/stored-file.ts`
- Create: `src/modules/files/domain/value-objects/file-visibility.ts`
- Create: `src/modules/files/domain/repositories/stored-file.repository.ts`
- Create: `src/modules/files/domain/errors/file-not-found.error.ts`
- Test: `src/modules/files/domain/entities/stored-file.spec.ts`
- Test: `src/modules/files/domain/value-objects/file-visibility.spec.ts`

**Interfaces:**
- Produces: `FileVisibility`, `parseFileVisibility(value: string): FileVisibility`, `StoredFile`, `StoredFileRepository`, and `FileNotFoundError`.
- `StoredFileRepository` exposes `insert(file: StoredFile): Promise<void>` and `findById(id: string): Promise<StoredFile | null>`.

- [ ] **Step 1: Write failing domain tests**

```typescript
import { StoredFile } from './stored-file';

describe('StoredFile', () => {
  it('creates metadata with a generated UUID', () => {
    const file = StoredFile.create({
      ownerId: 'user-a',
      visibility: 'private',
      filename: '0196d7fa-9752-7048-baf4-de9c43877a67.webp',
    });

    expect(file.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(file.ownerId).toBe('user-a');
  });
});
```

```typescript
import { parseFileVisibility } from './file-visibility';

describe('parseFileVisibility', () => {
  it.each(['public', 'private'] as const)('accepts %s', (value) => {
    expect(parseFileVisibility(value)).toBe(value);
  });

  it('rejects unsupported visibility', () => {
    expect(() => parseFileVisibility('internal')).toThrow(
      'Invalid file visibility',
    );
  });
});
```

- [ ] **Step 2: Run the new domain tests and confirm they fail because the files do not exist**

Run: `pnpm test -- --runInBand src/modules/files/domain/entities/stored-file.spec.ts src/modules/files/domain/value-objects/file-visibility.spec.ts`

Expected: FAIL with module-not-found errors.

- [ ] **Step 3: Implement the minimal domain types**

```typescript
// file-visibility.ts
export const FILE_VISIBILITIES = ['public', 'private'] as const;
export type FileVisibility = (typeof FILE_VISIBILITIES)[number];

export function parseFileVisibility(value: string): FileVisibility {
  if (value !== 'public' && value !== 'private') {
    throw new Error('Invalid file visibility');
  }
  return value;
}
```

```typescript
// stored-file.ts
import { v7 as uuidv7 } from 'uuid';
import type { FileVisibility } from '../value-objects/file-visibility';

export interface StoredFileProps {
  id: string;
  ownerId: string;
  visibility: FileVisibility;
  filename: string;
}

export class StoredFile {
  private constructor(private readonly props: StoredFileProps) {}

  static create(props: Omit<StoredFileProps, 'id'>): StoredFile {
    return new StoredFile({ id: uuidv7(), ...props });
  }

  static restore(props: StoredFileProps): StoredFile {
    return new StoredFile(props);
  }

  get id(): string { return this.props.id; }
  get ownerId(): string { return this.props.ownerId; }
  get visibility(): FileVisibility { return this.props.visibility; }
  get filename(): string { return this.props.filename; }
}
```

```typescript
// stored-file.repository.ts
import type { StoredFile } from '../entities/stored-file';

export abstract class StoredFileRepository {
  abstract insert(file: StoredFile): Promise<void>;
  abstract findById(id: string): Promise<StoredFile | null>;
}
```

```typescript
// file-not-found.error.ts
export class FileNotFoundError extends Error {
  constructor() {
    super('File not found');
    this.name = 'FileNotFoundError';
  }
}
```

- [ ] **Step 4: Run domain tests**

Run: `pnpm test -- --runInBand src/modules/files/domain`

Expected: PASS.

- [ ] **Step 5: Commit the domain slice**

```bash
git add src/modules/files/domain
git commit -m "refactor(files): add domain model"
```

### Task 2: Implement Application Ports And Use Cases

**Files:**
- Create: `src/modules/files/application/dto/upload-file.input.ts`
- Create: `src/modules/files/application/dto/file.output.ts`
- Create: `src/modules/files/application/ports/file-storage.port.ts`
- Create: `src/modules/files/application/use-cases/upload-file.use-case.ts`
- Create: `src/modules/files/application/use-cases/upload-file.use-case.spec.ts`
- Create: `src/modules/files/application/use-cases/get-private-file.use-case.ts`
- Create: `src/modules/files/application/use-cases/get-private-file.use-case.spec.ts`

**Interfaces:**
- Consumes: domain interfaces from Task 1.
- Produces: `FileStoragePort`, `UploadFileUseCase.execute(input): Promise<FileOutput>`, and `GetPrivateFileUseCase.execute(input): Promise<StoredFileContent>`.
- `FileStoragePort` exposes `store(input)`, `open(input)`, and `remove(input)`.

- [ ] **Step 1: Define framework-neutral DTO and port contracts**

```typescript
// upload-file.input.ts
import type { FileVisibility } from '../../domain/value-objects/file-visibility';

export interface UploadFileInput {
  file: { buffer: Buffer; mimetype: string };
  ownerId: string;
  visibility: FileVisibility;
}
```

```typescript
// file.output.ts
import type { Readable } from 'node:stream';
import type { FileVisibility } from '../../domain/value-objects/file-visibility';

export interface FileOutput {
  id: string;
  visibility: FileVisibility;
  url: string;
}

export interface StoredFileContent {
  stream: Readable;
  contentType: string;
  contentLength: number;
}
```

```typescript
// file-storage.port.ts
import type { Readable } from 'node:stream';
import type { FileVisibility } from '../../domain/value-objects/file-visibility';

export interface StoreFileInput {
  buffer: Buffer;
  mimetype: string;
  visibility: FileVisibility;
}

export interface OpenFileResult {
  stream: Readable;
  contentType: string;
  contentLength: number;
}

export abstract class FileStoragePort {
  abstract store(input: StoreFileInput): Promise<string>;
  abstract open(visibility: FileVisibility, filename: string): Promise<OpenFileResult>;
  abstract remove(visibility: FileVisibility, filename: string): Promise<void>;
}
```

- [ ] **Step 2: Write use-case tests covering success, access denial, and cleanup**

Use in-memory fakes implementing the exact abstract contracts. Assert that upload returns the current public/private URL format, persistence failure calls `remove`, private reads reject missing/public/foreign records with `FileNotFoundError`, and owner reads call storage with `private` plus the persisted filename.

- [ ] **Step 3: Run use-case tests and confirm they fail because use cases do not exist**

Run: `pnpm test -- --runInBand src/modules/files/application/use-cases`

Expected: FAIL with module-not-found errors.

- [ ] **Step 4: Implement `UploadFileUseCase`**

```typescript
export class UploadFileUseCase {
  constructor(
    private readonly repository: StoredFileRepository,
    private readonly storage: FileStoragePort,
  ) {}

  async execute(input: UploadFileInput): Promise<FileOutput> {
    const filename = await this.storage.store({
      buffer: input.file.buffer,
      mimetype: input.file.mimetype,
      visibility: input.visibility,
    });
    const file = StoredFile.create({
      ownerId: input.ownerId,
      visibility: input.visibility,
      filename,
    });

    try {
      await this.repository.insert(file);
    } catch (error) {
      await this.storage.remove(input.visibility, filename).catch(() => undefined);
      throw error;
    }

    return {
      id: file.id,
      visibility: file.visibility,
      url: file.visibility === 'public' ? `/assets/${file.filename}` : `/api/files/${file.id}`,
    };
  }
}
```

- [ ] **Step 5: Implement `GetPrivateFileUseCase`**

```typescript
export class GetPrivateFileUseCase {
  constructor(
    private readonly repository: StoredFileRepository,
    private readonly storage: FileStoragePort,
  ) {}

  async execute(input: { id: string; userId: string }): Promise<StoredFileContent> {
    const file = await this.repository.findById(input.id);
    if (!file || file.visibility !== 'private' || file.ownerId !== input.userId) {
      throw new FileNotFoundError();
    }
    return this.storage.open('private', file.filename);
  }
}
```

- [ ] **Step 6: Run application and domain tests**

Run: `pnpm test -- --runInBand src/modules/files/domain src/modules/files/application/use-cases`

Expected: PASS.

- [ ] **Step 7: Commit the application slice**

```bash
git add src/modules/files/application src/modules/files/domain
git commit -m "refactor(files): add file use cases"
```

### Task 3: Add MikroORM And Local Storage Adapters

**Files:**
- Create: `src/modules/files/infrastructure/persistence/entities/stored-file.orm-entity.ts`
- Create: `src/modules/files/infrastructure/persistence/mappers/stored-file.mapper.ts`
- Create: `src/modules/files/infrastructure/persistence/repositories/mikro-stored-file.repository.ts`
- Create: `src/modules/files/infrastructure/storage/local-file-storage.adapter.ts`
- Create: `src/modules/files/infrastructure/storage/local-file-storage.adapter.spec.ts`
- Move: `src/modules/files/infrastructure/persistence/migrations/Migration20260922000000.ts`
- Modify: `src/infrastructure/config/database.config.ts`
- Modify: `mikro-orm.config.js`

**Interfaces:**
- Consumes: `StoredFileRepository`, `StoredFile`, and `FileStoragePort`.
- Produces: `StoredFileOrmEntity`, `MikroStoredFileRepository`, and `LocalFileStorageAdapter`.

- [ ] **Step 1: Move the existing image utility tests to the storage adapter test and replace NestJS exception assertions with plain error-message assertions**

Retain the current cases: tall-image 16:9 crop, unsupported MIME, size limit, WebP output, and path traversal rejection. Use a temporary folder under `storages` and remove only that test folder in `afterEach`/`finally`.

- [ ] **Step 2: Run the adapter test and confirm it fails because the adapter does not exist**

Run: `pnpm test -- --runInBand src/modules/files/infrastructure/storage/local-file-storage.adapter.spec.ts`

Expected: FAIL with module-not-found error.

- [ ] **Step 3: Implement the ORM entity and mapper**

Keep table name `stored_files`, columns `id`, `owner_id`, `visibility`, and `filename`, including the current lengths and UUID primary key. Mapper methods must be:

```typescript
export class StoredFileMapper {
  static toDomain(entity: StoredFileOrmEntity): StoredFile;
  static toPersistence(file: StoredFile): StoredFileOrmEntity;
}
```

- [ ] **Step 4: Implement the MikroORM repository adapter**

```typescript
@Injectable()
export class MikroStoredFileRepository implements StoredFileRepository {
  constructor(
    @InjectRepository(StoredFileOrmEntity)
    private readonly repository: EntityRepository<StoredFileOrmEntity>,
  ) {}

  async insert(file: StoredFile): Promise<void> {
    await this.repository.insert(StoredFileMapper.toPersistence(file));
  }

  async findById(id: string): Promise<StoredFile | null> {
    const entity = await this.repository.findOne({ id });
    return entity ? StoredFileMapper.toDomain(entity) : null;
  }
}
```

- [ ] **Step 5: Implement the local storage adapter**

Move Sharp cropping, actual MIME verification, UUID v7 filename generation, recursive directory creation, safe filename validation, WebP conversion, stream creation, stat lookup, and deletion from `ImageUtils` into `LocalFileStorageAdapter`. Use constructor injection with default base path `path.join(process.cwd(), 'storages')` so tests can provide an isolated path.

- [ ] **Step 6: Update both MikroORM configurations**

Change entity globs from `**/*.entity.{js,ts}` to the exact new suffix `**/*.orm-entity.{js,ts}`. Keep migration paths and glob unchanged so the existing migration remains discoverable.

- [ ] **Step 7: Run adapter tests and build**

Run: `pnpm test -- --runInBand src/modules/files/infrastructure`

Expected: PASS.

Run: `pnpm build`

Expected: SWC compiles all source files successfully.

- [ ] **Step 8: Commit infrastructure adapters**

```bash
git add mikro-orm.config.js src/modules/files/infrastructure src/infrastructure/config/database.config.ts
git commit -m "refactor(files): add infrastructure adapters"
```

### Task 4: Rewire NestJS Presentation And Composition Root

**Files:**
- Create: `src/modules/files/presentation/http/dto/upload-file.request.ts`
- Move: `src/modules/files/interface/jwt-auth.guard.ts` to `src/modules/files/presentation/http/guards/jwt-auth.guard.ts`
- Move: `src/modules/files/interface/jwt-auth.guard.spec.ts` to `src/modules/files/presentation/http/guards/jwt-auth.guard.spec.ts`
- Create: `src/modules/files/presentation/http/file.controller.ts`
- Modify: `src/modules/files/files.module.ts`
- Modify: `test/files.e2e-spec.ts`
- Remove: old file service, access helper, old controller, old ORM entity, and replaced tests.

**Interfaces:**
- Consumes: both use cases and all concrete adapters.
- Produces: unchanged HTTP routes and NestJS provider bindings.

- [ ] **Step 1: Update the E2E test to inject use cases**

Mock `UploadFileUseCase.execute` and `GetPrivateFileUseCase.execute` independently. Preserve assertions for 401 without token, owner ID propagation, default private visibility, cache-control header, and private body content.

- [ ] **Step 2: Run the E2E test and confirm it fails against missing presentation files**

Run: `pnpm test:e2e -- --runInBand test/files.e2e-spec.ts`

Expected: FAIL with module-not-found errors for the new controller path.

- [ ] **Step 3: Implement the request DTO and controller**

`UploadFileRequest` validates optional `visibility` with `@IsIn(['public', 'private'])`. The controller converts invalid/missing-file and `FileNotFoundError` cases to the existing 400/404 NestJS responses, creates `StreamableFile` only at the HTTP boundary, and keeps `FileInterceptor` size limit at 1 MiB.

- [ ] **Step 4: Rewire `FilesModule` as the composition root**

Register `MikroOrmModule.forFeature([StoredFileOrmEntity])`, JWT configuration, both use cases, guard, concrete adapters, and these bindings:

```typescript
{ provide: StoredFileRepository, useClass: MikroStoredFileRepository },
{ provide: FileStoragePort, useClass: LocalFileStorageAdapter },
```

- [ ] **Step 5: Remove replaced files only after imports no longer reference them**

Run: `rg -n "FileService|ImageUtils|file-access|interface/file|stored-file\.entity" src test`

Expected: no production references to the replaced classes or old paths.

- [ ] **Step 6: Run feature unit and E2E tests**

Run: `pnpm test -- --runInBand src/modules/files`

Expected: PASS.

Run: `pnpm test:e2e -- --runInBand test/files.e2e-spec.ts`

Expected: PASS.

- [ ] **Step 7: Commit the presentation wiring**

```bash
git add src/modules/files test/files.e2e-spec.ts
git commit -m "refactor(files): wire clean architecture"
```

### Task 5: Normalize Global Layer Names

**Files:**
- Move: `src/infra/**` to `src/infrastructure/**`
- Move: `src/shared/common/base-use-case.ts` to `src/shared/application/base-use-case.ts`
- Move: `src/shared/filters/**` to `src/shared/presentation/filters/**`
- Move: `src/shared/interceptors/**` to `src/shared/presentation/interceptors/**`
- Move: `src/shared/pagination/**` to `src/shared/presentation/pagination/**`
- Move: `src/shared/validation/**` to `src/shared/presentation/validation/**`
- Modify: `src/main.ts`
- Modify: `src/app.module.ts`
- Modify: all affected test imports.

**Interfaces:**
- Produces: approved top-level `infrastructure` and layered `shared` paths without changing runtime behavior.

- [ ] **Step 1: Move files with history-preserving `git mv` commands**

Create destination directories first, then move only existing files. Do not create empty `guards`, `decorators`, or `logging` directories.

- [ ] **Step 2: Replace aliases and relative imports**

Run: `rg -n "@/infra|@/shared/(common|filters|interceptors|pagination|validation)" src test`

Update every result to `@/infrastructure/...`, `@/shared/application/...`, or `@/shared/presentation/...`.

- [ ] **Step 3: Verify old paths are gone**

Run: `rg -n "@/infra|@/shared/(common|filters|interceptors|pagination|validation)" src test`

Expected: no matches.

- [ ] **Step 4: Run all unit tests and build**

Run: `pnpm test -- --runInBand`

Expected: all suites pass with zero failures.

Run: `pnpm build`

Expected: successful SWC compilation.

- [ ] **Step 5: Commit path normalization**

```bash
git add src test
git commit -m "refactor: normalize architecture paths"
```

### Task 6: Update README To Match The Implemented Architecture

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: final paths and behavior from Tasks 1-5.
- Produces: accurate onboarding and architecture documentation.

- [ ] **Step 1: Replace the aspirational project tree with the actual tree**

Document only directories and representative files that exist after refactoring. Include the files module as the canonical feature example.

- [ ] **Step 2: Rewrite architecture rules**

State the permitted dependency direction, identify `files.module.ts` as composition root, distinguish request DTOs from application input types, and explain that DDD building blocks are introduced only for real invariants.

- [ ] **Step 3: Correct operational documentation**

Document `postgis/postgis:16-3.5-alpine`, one-shot migrator behavior (`Exited (0)` is success), `docker compose up -d --build`, `docker compose logs -f api`, and `docker compose run --rm migrator`.

- [ ] **Step 4: Add architecture references**

Link Robert C. Martin's Clean Architecture document supplied by the user and the reviewed public examples: Sairyss Domain-Driven Hexagon, Andrea Acampora NestJS DDD DevOps, oNo500 NestJS Boilerplate architecture, Bitloops DDD Hexagonal example, and MikroORM RealWorld as the pragmatic non-Clean-Architecture contrast.

- [ ] **Step 5: Check documentation consistency**

Run: `rg -n "src/infra|modules/files/interface|FileService|ImageUtils|stored-file\.entity|postgres:16-alpine" README.md`

Expected: no stale references.

Run: `git diff --check -- README.md`

Expected: no whitespace errors.

- [ ] **Step 6: Commit documentation**

```bash
git add README.md
git commit -m "docs: describe clean architecture"
```

### Task 7: Full Regression And Docker Verification

**Files:**
- Modify only if a verification failure reveals a defect in files changed by Tasks 1-6.

**Interfaces:**
- Verifies the complete refactor and unchanged external behavior.

- [ ] **Step 1: Run formatting and lint checks**

Run: `pnpm exec prettier --check "src/**/*.ts" "test/**/*.ts" README.md`

Expected: all matched files use Prettier formatting.

Run: `pnpm lint`

Expected: zero ESLint errors.

- [ ] **Step 2: Run the complete test suite**

Run: `pnpm test -- --runInBand`

Expected: all unit tests pass.

Run: `pnpm test:e2e -- --runInBand`

Expected: all E2E tests pass.

- [ ] **Step 3: Build the application**

Run: `pnpm build`

Expected: successful SWC compilation.

- [ ] **Step 4: Validate and rebuild Docker**

Run: `docker compose config`

Expected: valid Compose configuration.

Run: `docker compose up -d --build`

Expected: PostgreSQL becomes healthy, migrator exits with code 0, and API becomes healthy.

- [ ] **Step 5: Verify service states and HTTP response**

Run: `docker compose ps -a`

Expected: `postgres` and `api` are healthy; `migrator` is `Exited (0)`.

Run: `Invoke-WebRequest -UseBasicParsing http://localhost:3000/ | Select-Object StatusCode, Content`

Expected: HTTP 200 with the existing success envelope containing `Hello World`.

- [ ] **Step 6: Review the final diff for boundary violations**

Run: `rg -n "@nestjs|@mikro-orm|express|node:fs|node:path|sharp" src/modules/files/domain src/modules/files/application`

Expected: no matches except framework-neutral Node types explicitly accepted by the design, such as `node:stream` in application DTOs.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 7: Record any final verification-only correction**

If verification required a scoped correction, commit only those corrected files with a Conventional Commit message describing the defect. If no correction was required, do not create an empty commit.
