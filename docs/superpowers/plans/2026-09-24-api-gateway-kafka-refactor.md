# API Gateway Kafka Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor this repository into an API Gateway that receives client HTTP requests and communicates with business services through Kafka.

**Architecture:** The gateway remains a NestJS HTTP application for client and operational traffic. Business requests are converted into Kafka command envelopes through a small gateway-owned Kafka adapter. Business services and their databases live outside this repository.

**Tech Stack:** TypeScript 5.9, NestJS 11, `@nestjs/microservices`, KafkaJS, Jest 30, Supertest, Docker Compose, pnpm 11.

**Spec:** `docs/superpowers/specs/2026-09-24-api-gateway-kafka-microservice-design.md`

## Global Constraints

- This repository becomes `api-gateway`.
- Client requests enter through HTTP or WebSocket at the API Gateway.
- Business service communication goes through Kafka commands, replies, and events.
- Remove the current `files` feature as gateway-owned business logic.
- The gateway must not own MikroORM entities, migrations, feature repositories, image processing, or business database tables.
- Initial topic convention: `stream.commands`, `stream.events`, and `stream.replies`.
- Command envelopes include `requestId`, optional `userId`, `type`, and `payload`.
- Keep operational endpoints `GET /health/live` and `GET /health/ready`.
- Required env keys: `APP_NAME`, `APP_PORT`, `NODE_ENV`, `KAFKA_BROKERS`, `KAFKA_CLIENT_ID`, `KAFKA_GROUP_ID`, `JWT_SECRET`, and `TOKEN_EXPIRATION`.
- Do not add CQRS, event sourcing, or saga orchestration.
- Keep unrelated dirty worktree changes intact.

## Review Focus

- Blank or comma-only `KAFKA_BROKERS` must fail at startup with a clear error; Task 1 tests this.
- Kafka request/reply timeout must become a stable gateway timeout error; Task 2 tests this.
- Downstream reply errors must not expose raw Kafka or stack traces; Task 2 tests this.
- `POST /api/streams` must reject invalid body fields before publishing Kafka commands; Task 4 tests this.
- `/health/ready` must return unavailable when Kafka has not connected; Task 3 tests this.

---

## File Map

### Create

- `src/infrastructure/kafka/kafka.constants.ts`: shared Kafka client token and stream topic constants.
- `src/infrastructure/kafka/kafka.errors.ts`: gateway-owned timeout and downstream error types.
- `src/infrastructure/kafka/kafka-gateway.service.ts`: wrapper around Nest `ClientKafka` with readiness, request/reply, timeout, and reply normalization.
- `src/infrastructure/kafka/kafka.module.ts`: Kafka client registration using validated secrets.
- `src/infrastructure/kafka/kafka-gateway.service.spec.ts`: Kafka adapter unit tests with a fake client.
- `src/infrastructure/health/health.controller.ts`: liveness and readiness endpoints.
- `src/infrastructure/health/health.module.ts`: health controller module.
- `src/infrastructure/health/health.controller.spec.ts`: health endpoint unit tests.
- `src/shared/presentation/guards/jwt-auth.guard.ts`: reusable JWT HTTP guard for gateway endpoints.
- `src/shared/presentation/guards/jwt-auth.guard.spec.ts`: guard tests.
- `src/modules/streams/application/dto/create-stream.input.ts`: application input/output types for the gateway contract example.
- `src/modules/streams/application/use-cases/create-stream.use-case.ts`: creates a stream command envelope and requests Kafka reply.
- `src/modules/streams/application/use-cases/create-stream.use-case.spec.ts`: use-case tests.
- `src/modules/streams/presentation/http/dto/create-stream.request.ts`: HTTP request DTO for stream creation.
- `src/modules/streams/presentation/http/streams.controller.ts`: HTTP endpoint that maps client request to the use case.
- `src/modules/streams/presentation/http/streams.controller.spec.ts`: controller tests.
- `src/modules/streams/streams.module.ts`: gateway streams module.
- `test/streams.e2e-spec.ts`: gateway E2E coverage for HTTP validation, auth, and Kafka command publishing.

### Modify

- `package.json`: add Kafka transport dependencies and remove database/storage dependencies after references are gone.
- `pnpm-lock.yaml`: update through pnpm commands.
- `.env.example`: replace database keys with Kafka gateway keys.
- `src/infrastructure/secret/adapter.ts`: expose gateway and Kafka configuration only.
- `src/infrastructure/secret/service.ts`: validate Kafka env and remove database config.
- `src/infrastructure/secret/service.spec.ts`: update env validation tests.
- `src/app.module.ts`: remove database/static file modules, import health and streams modules.
- `src/main.ts`: enable shutdown hooks and preserve global HTTP behavior.
- `src/modules/index.ts`: import `StreamsModule` instead of `FilesModule`.
- `test/app.e2e-spec.ts`: remove static storage assertions and files/database module mocks.
- `docker-compose.yml`: replace PostgreSQL/migrator with Kafka plus API Gateway.
- `Dockerfile`: keep app build/runtime only; no migration expectations.
- `README.md`: document API Gateway role, Kafka flow, env, Docker, and how to add gateway endpoints.

### Delete

- `src/modules/files/**`
- `src/infrastructure/database/**`
- `src/infrastructure/config/database.config.ts`
- `mikro-orm.config.js`
- `scripts/create-migration.js`
- `scripts/run-seeder.js`
- `test/files.e2e-spec.ts`

---

### Task 1: Gateway Environment Configuration

**Files:**
- Modify: `src/infrastructure/secret/adapter.ts`
- Modify: `src/infrastructure/secret/service.ts`
- Modify: `src/infrastructure/secret/service.spec.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: environment variables from process env.
- Produces: `IAdapterSecret` with gateway Kafka fields while keeping the existing database fields until Task 5 removes the database module.

- [ ] **Step 1: Replace the secret service tests**

Write `src/infrastructure/secret/service.spec.ts`:

```typescript
import { SecretService } from './service';

describe('SecretService', () => {
  const names = [
    'APP_NAME',
    'APP_PORT',
    'KAFKA_BROKERS',
    'KAFKA_CLIENT_ID',
    'KAFKA_GROUP_ID',
    'DB_USER',
    'DB_PASSWORD',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_SYNC',
    'JWT_SECRET',
    'TOKEN_EXPIRATION',
  ] as const;

  const original = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );

  beforeEach(() => {
    Object.assign(process.env, {
      APP_NAME: 'api-gateway',
      APP_PORT: '3000',
      KAFKA_BROKERS: 'localhost:9092, kafka:9092 ',
      KAFKA_CLIENT_ID: 'api-gateway',
      KAFKA_GROUP_ID: 'api-gateway',
      DB_USER: 'postgres',
      DB_PASSWORD: 'test-password',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_NAME: 'test',
      DB_SYNC: 'false',
      JWT_SECRET: 'test-secret',
      TOKEN_EXPIRATION: '1d',
    });
  });

  afterAll(() => {
    for (const name of names) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  });

  it('parses the HTTP port as a number', () => {
    expect(new SecretService().APP_PORT).toBe(3000);
  });

  it('parses Kafka brokers into a trimmed list', () => {
    expect(new SecretService().KAFKA_BROKERS).toEqual([
      'localhost:9092',
      'kafka:9092',
    ]);
  });

  it('rejects a missing JWT secret', () => {
    process.env.JWT_SECRET = '';
    expect(() => new SecretService()).toThrow('JWT_SECRET is required');
  });

  it('rejects an invalid port', () => {
    process.env.APP_PORT = 'abc';
    expect(() => new SecretService()).toThrow('APP_PORT must be a valid port');
  });

  it('rejects an empty Kafka broker list', () => {
    process.env.KAFKA_BROKERS = ' , ';
    expect(() => new SecretService()).toThrow('KAFKA_BROKERS is required');
  });
});
```

- [ ] **Step 2: Run the config test and confirm current code fails**

Run: `pnpm test -- --runInBand src/infrastructure/secret/service.spec.ts`

Expected: FAIL because `KAFKA_BROKERS` does not exist on `SecretService`.

- [ ] **Step 3: Replace `IAdapterSecret`**

Write `src/infrastructure/secret/adapter.ts`:

```typescript
export abstract class IAdapterSecret {
  abstract APP_NAME: string;
  abstract APP_PORT: number;

  abstract KAFKA_BROKERS: string[];
  abstract KAFKA_CLIENT_ID: string;
  abstract KAFKA_GROUP_ID: string;

  abstract POSTGRES_URI: string;
  abstract POSTGRES_SYNC: boolean;

  abstract JWT_SECRET: string;
  abstract TOKEN_EXPIRATION: string;
}
```

- [ ] **Step 4: Replace `SecretService`**

Write `src/infrastructure/secret/service.ts`:

```typescript
import { ConfigService } from '@nestjs/config';
import { IAdapterSecret } from './adapter';

export class SecretService extends ConfigService implements IAdapterSecret {
  APP_NAME = this.required('APP_NAME');
  APP_PORT = this.readPort();

  KAFKA_BROKERS = this.readList('KAFKA_BROKERS');
  KAFKA_CLIENT_ID = this.required('KAFKA_CLIENT_ID');
  KAFKA_GROUP_ID = this.required('KAFKA_GROUP_ID');

  POSTGRES_URI = `postgres://${this.required('DB_USER')}:${this.required(
    'DB_PASSWORD',
  )}@${this.required('DB_HOST')}:${this.required('DB_PORT')}/${this.required('DB_NAME')}`;

  POSTGRES_SYNC = this.get('DB_SYNC') === 'true';

  JWT_SECRET = this.required('JWT_SECRET');
  TOKEN_EXPIRATION = this.required('TOKEN_EXPIRATION');

  private required(name: string): string {
    const value = this.get<string>(name);
    if (!value) throw new Error(`${name} is required`);
    return value;
  }

  private readList(name: string): string[] {
    const values = this.required(name)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (values.length === 0) {
      throw new Error(`${name} is required`);
    }

    return values;
  }

  private readPort(): number {
    const port = Number(this.required('APP_PORT'));
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('APP_PORT must be a valid port');
    }
    return port;
  }
}
```

- [ ] **Step 5: Update `.env.example`**

Write `.env.example`:

```env
APP_NAME=api-gateway
APP_PORT=3000
NODE_ENV=development

KAFKA_BROKERS=localhost:9094
KAFKA_CLIENT_ID=api-gateway
KAFKA_GROUP_ID=api-gateway

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ddd_nest_api
DB_SYNC=false

JWT_SECRET=change-this-secret-before-deployment
TOKEN_EXPIRATION=1000d
```

- [ ] **Step 6: Run the config test**

Run: `pnpm test -- --runInBand src/infrastructure/secret/service.spec.ts`

Expected: PASS.

- [ ] **Step 7: Commit gateway config**

```bash
git add .env.example src/infrastructure/secret
git commit -m "refactor(config): switch gateway env to kafka"
```

### Task 2: Kafka Gateway Adapter

**Files:**
- Create: `src/infrastructure/kafka/kafka.constants.ts`
- Create: `src/infrastructure/kafka/kafka.errors.ts`
- Create: `src/infrastructure/kafka/kafka-gateway.service.ts`
- Create: `src/infrastructure/kafka/kafka.module.ts`
- Create: `src/infrastructure/kafka/kafka-gateway.service.spec.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `IAdapterSecret.KAFKA_BROKERS`, `IAdapterSecret.KAFKA_CLIENT_ID`, and `IAdapterSecret.KAFKA_GROUP_ID`.
- Produces: `KafkaGatewayService.request<TData, TPayload>(topic: string, message: KafkaCommandEnvelope<TPayload>, timeoutMs?: number): Promise<TData>`, `KafkaGatewayService.isReady(): boolean`, `STREAM_TOPICS.commands`, `STREAM_TOPICS.events`, and `STREAM_TOPICS.replies`.

- [ ] **Step 1: Add Kafka dependencies**

Run: `pnpm add @nestjs/microservices kafkajs`

Expected: `package.json` and `pnpm-lock.yaml` include `@nestjs/microservices` and `kafkajs`.

- [ ] **Step 2: Write the Kafka adapter tests**

Write `src/infrastructure/kafka/kafka-gateway.service.spec.ts`:

```typescript
import { of, throwError } from 'rxjs';
import { KafkaGatewayDownstreamError, KafkaGatewayTimeoutError } from './kafka.errors';
import { KafkaGatewayService } from './kafka-gateway.service';

describe('KafkaGatewayService', () => {
  const client = {
    subscribeToResponseOf: jest.fn(),
    connect: jest.fn(),
    close: jest.fn(),
    send: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    client.connect.mockResolvedValue(undefined);
    client.close.mockResolvedValue(undefined);
  });

  it('subscribes to stream command replies and marks itself ready after connect', async () => {
    const service = new KafkaGatewayService(client as never);

    await service.onModuleInit();

    expect(client.subscribeToResponseOf).toHaveBeenCalledWith('stream.commands');
    expect(client.connect).toHaveBeenCalled();
    expect(service.isReady()).toBe(true);
  });

  it('marks itself not ready after destroy', async () => {
    const service = new KafkaGatewayService(client as never);
    await service.onModuleInit();

    await service.onModuleDestroy();

    expect(client.close).toHaveBeenCalled();
    expect(service.isReady()).toBe(false);
  });

  it('returns data from an ok reply', async () => {
    client.send.mockReturnValue(
      of({ ok: true, data: { streamId: 'stream-1', status: 'created' } }),
    );
    const service = new KafkaGatewayService(client as never);

    await expect(
      service.request('stream.commands', {
        requestId: 'req-1',
        userId: 'user-1',
        type: 'stream.create',
        payload: { title: 'Demo' },
      }),
    ).resolves.toEqual({ streamId: 'stream-1', status: 'created' });
  });

  it('normalizes downstream error replies', async () => {
    client.send.mockReturnValue(
      of({
        ok: false,
        error: { code: 'STREAM_LIMIT_REACHED', message: 'Limit reached' },
      }),
    );
    const service = new KafkaGatewayService(client as never);

    await expect(
      service.request('stream.commands', {
        requestId: 'req-1',
        userId: 'user-1',
        type: 'stream.create',
        payload: { title: 'Demo' },
      }),
    ).rejects.toEqual(
      new KafkaGatewayDownstreamError('STREAM_LIMIT_REACHED', 'Limit reached'),
    );
  });

  it('converts transport timeouts into a gateway timeout error', async () => {
    client.send.mockReturnValue(
      throwError(() => new Error('Timeout has occurred')),
    );
    const service = new KafkaGatewayService(client as never);

    await expect(
      service.request(
        'stream.commands',
        {
          requestId: 'req-1',
          userId: 'user-1',
          type: 'stream.create',
          payload: { title: 'Demo' },
        },
        1,
      ),
    ).rejects.toBeInstanceOf(KafkaGatewayTimeoutError);
  });
});
```

- [ ] **Step 3: Run the Kafka adapter tests and confirm they fail**

Run: `pnpm test -- --runInBand src/infrastructure/kafka/kafka-gateway.service.spec.ts`

Expected: FAIL with module-not-found errors for Kafka adapter files.

- [ ] **Step 4: Add constants and errors**

Write `src/infrastructure/kafka/kafka.constants.ts`:

```typescript
export const KAFKA_CLIENT = Symbol('KAFKA_CLIENT');

export const STREAM_TOPICS = {
  commands: 'stream.commands',
  events: 'stream.events',
  replies: 'stream.replies',
} as const;
```

Write `src/infrastructure/kafka/kafka.errors.ts`:

```typescript
export class KafkaGatewayTimeoutError extends Error {
  constructor() {
    super('Downstream service timed out');
    this.name = 'KafkaGatewayTimeoutError';
  }
}

export class KafkaGatewayDownstreamError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'KafkaGatewayDownstreamError';
  }
}
```

- [ ] **Step 5: Add the Kafka gateway service**

Write `src/infrastructure/kafka/kafka-gateway.service.ts`:

```typescript
import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { KAFKA_CLIENT, STREAM_TOPICS } from './kafka.constants';
import { KafkaGatewayDownstreamError, KafkaGatewayTimeoutError } from './kafka.errors';

export interface KafkaCommandEnvelope<TPayload> {
  requestId: string;
  userId?: string;
  type: string;
  payload: TPayload;
}

interface KafkaReplyEnvelope<TData> {
  ok: boolean;
  data?: TData;
  error?: {
    code?: string;
    message?: string;
  };
}

@Injectable()
export class KafkaGatewayService implements OnModuleInit, OnModuleDestroy {
  private ready = false;

  constructor(@Inject(KAFKA_CLIENT) private readonly client: ClientKafka) {}

  async onModuleInit(): Promise<void> {
    this.client.subscribeToResponseOf(STREAM_TOPICS.commands);
    await this.client.connect();
    this.ready = true;
  }

  async onModuleDestroy(): Promise<void> {
    this.ready = false;
    await this.client.close();
  }

  isReady(): boolean {
    return this.ready;
  }

  async request<TData, TPayload>(
    topic: string,
    message: KafkaCommandEnvelope<TPayload>,
    timeoutMs = 5000,
  ): Promise<TData> {
    try {
      const reply = await firstValueFrom(
        this.client.send<KafkaReplyEnvelope<TData>, KafkaCommandEnvelope<TPayload>>(
          topic,
          message,
        ).pipe(timeout({ first: timeoutMs })),
      );

      if (!reply.ok) {
        throw new KafkaGatewayDownstreamError(
          reply.error?.code ?? 'DOWNSTREAM_ERROR',
          reply.error?.message ?? 'Downstream service error',
        );
      }

      return reply.data as TData;
    } catch (error) {
      if (error instanceof KafkaGatewayDownstreamError) {
        throw error;
      }

      throw new KafkaGatewayTimeoutError();
    }
  }
}
```

- [ ] **Step 6: Add the Kafka module**

Write `src/infrastructure/kafka/kafka.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SecretModule } from '@/infrastructure/secret';
import { IAdapterSecret } from '@/infrastructure/secret/adapter';
import { KAFKA_CLIENT } from './kafka.constants';
import { KafkaGatewayService } from './kafka-gateway.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: KAFKA_CLIENT,
        imports: [SecretModule],
        inject: [IAdapterSecret],
        useFactory: (secrets: IAdapterSecret) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: secrets.KAFKA_CLIENT_ID,
              brokers: secrets.KAFKA_BROKERS,
            },
            consumer: {
              groupId: secrets.KAFKA_GROUP_ID,
            },
          },
        }),
      },
    ]),
  ],
  providers: [KafkaGatewayService],
  exports: [KafkaGatewayService],
})
export class KafkaModule {}
```

- [ ] **Step 7: Run Kafka adapter tests**

Run: `pnpm test -- --runInBand src/infrastructure/kafka/kafka-gateway.service.spec.ts`

Expected: PASS.

- [ ] **Step 8: Commit Kafka infrastructure**

```bash
git add package.json pnpm-lock.yaml src/infrastructure/kafka
git commit -m "feat(kafka): add gateway client adapter"
```

### Task 3: Health Endpoints And Shutdown Hooks

**Files:**
- Create: `src/infrastructure/health/health.controller.ts`
- Create: `src/infrastructure/health/health.module.ts`
- Create: `src/infrastructure/health/health.controller.spec.ts`
- Modify: `src/app.module.ts`
- Modify: `src/main.ts`
- Modify: `test/app.e2e-spec.ts`

**Interfaces:**
- Consumes: `KafkaGatewayService.isReady(): boolean`.
- Produces: `GET /health/live`, `GET /health/ready`, and Nest shutdown hooks in `main.ts`.

- [ ] **Step 1: Write health controller tests**

Write `src/infrastructure/health/health.controller.spec.ts`:

```typescript
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports liveness', () => {
    const controller = new HealthController({ isReady: () => false } as never);

    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('reports readiness when Kafka is connected', () => {
    const controller = new HealthController({ isReady: () => true } as never);

    expect(controller.ready()).toEqual({
      status: 'ok',
      dependencies: { kafka: 'ok' },
    });
  });

  it('rejects readiness when Kafka is not connected', () => {
    const controller = new HealthController({ isReady: () => false } as never);

    expect(() => controller.ready()).toThrow(ServiceUnavailableException);
  });
});
```

- [ ] **Step 2: Run health tests and confirm they fail**

Run: `pnpm test -- --runInBand src/infrastructure/health/health.controller.spec.ts`

Expected: FAIL with module-not-found errors.

- [ ] **Step 3: Add health controller**

Write `src/infrastructure/health/health.controller.ts`:

```typescript
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { KafkaGatewayService } from '@/infrastructure/kafka/kafka-gateway.service';

@Controller('health')
export class HealthController {
  constructor(private readonly kafka: KafkaGatewayService) {}

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  ready() {
    if (!this.kafka.isReady()) {
      throw new ServiceUnavailableException('Kafka is not ready');
    }

    return {
      status: 'ok',
      dependencies: { kafka: 'ok' },
    };
  }
}
```

- [ ] **Step 4: Add health module**

Write `src/infrastructure/health/health.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { KafkaModule } from '@/infrastructure/kafka/kafka.module';
import { HealthController } from './health.controller';

@Module({
  imports: [KafkaModule],
  controllers: [HealthController],
})
export class HealthModule {}
```

- [ ] **Step 5: Wire health module and shutdown hooks**

Modify `src/main.ts` so `bootstrap()` includes:

```typescript
  app.enableShutdownHooks();
```

after the app is created and before `app.listen(APP_PORT)`.

Modify `src/app.module.ts` so it imports `HealthModule`. Leave the legacy
database, static-file, and container imports in place until Task 5 removes the
files feature and database ownership together.

Add this import:

```typescript
import { HealthModule } from '@/infrastructure/health/health.module';
```

Add `HealthModule` to the existing `imports` array:

```typescript
  imports: [
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), 'storages', 'public'),
      useGlobalPrefix: false,
      serveRoot: '/assets',
      exclude: ['/api/{*test}'],
      serveStaticOptions: {
        fallthrough: false,
        cacheControl: true,
      },
    }),
    WinstonModule.forRoot(winstonConfig),
    SecretModule,
    DatabaseModule,
    HealthModule,
    ContainerModules,
  ],
```

- [ ] **Step 6: Update app E2E root coverage**

Replace `test/app.e2e-spec.ts` with:

```typescript
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

jest.mock('../src/infrastructure/health/health.module', () => ({
  HealthModule: class HealthModule {},
}));

jest.mock('../src/modules', () => ({
  ContainerModules: class ContainerModules {},
}));

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World');
  });
});
```

- [ ] **Step 7: Run health and app tests**

Run: `pnpm test -- --runInBand src/infrastructure/health/health.controller.spec.ts`

Expected: PASS.

Run: `pnpm test:e2e -- --runInBand test/app.e2e-spec.ts`

Expected: PASS.

- [ ] **Step 8: Commit health endpoints**

```bash
git add src/infrastructure/health src/app.module.ts src/main.ts test/app.e2e-spec.ts
git commit -m "feat(health): add gateway readiness checks"
```

### Task 4: Streams Gateway Contract Module

**Files:**
- Create: `src/shared/presentation/guards/jwt-auth.guard.ts`
- Create: `src/shared/presentation/guards/jwt-auth.guard.spec.ts`
- Create: `src/modules/streams/application/dto/create-stream.input.ts`
- Create: `src/modules/streams/application/use-cases/create-stream.use-case.ts`
- Create: `src/modules/streams/application/use-cases/create-stream.use-case.spec.ts`
- Create: `src/modules/streams/presentation/http/dto/create-stream.request.ts`
- Create: `src/modules/streams/presentation/http/streams.controller.ts`
- Create: `src/modules/streams/presentation/http/streams.controller.spec.ts`
- Create: `src/modules/streams/streams.module.ts`
- Create: `test/streams.e2e-spec.ts`
- Modify: `src/modules/index.ts`

**Interfaces:**
- Consumes: `KafkaGatewayService.request<TData, TPayload>()`, `STREAM_TOPICS.commands`, `JWT_SECRET`, and `TOKEN_EXPIRATION`.
- Produces: `POST /api/streams` with JWT auth, request validation, and a Kafka command envelope of type `stream.create`.

- [ ] **Step 1: Write use-case test**

Write `src/modules/streams/application/use-cases/create-stream.use-case.spec.ts`:

```typescript
import { STREAM_TOPICS } from '@/infrastructure/kafka/kafka.constants';
import { CreateStreamUseCase } from './create-stream.use-case';

describe('CreateStreamUseCase', () => {
  it('publishes a stream.create command envelope', async () => {
    const kafka = {
      request: jest.fn().mockResolvedValue({
        streamId: 'stream-1',
        status: 'created',
      }),
    };
    const useCase = new CreateStreamUseCase(kafka as never);

    await expect(
      useCase.execute({
        userId: 'user-1',
        title: 'Launch stream',
        description: 'Demo',
      }),
    ).resolves.toEqual({ streamId: 'stream-1', status: 'created' });

    expect(kafka.request).toHaveBeenCalledWith(
      STREAM_TOPICS.commands,
      expect.objectContaining({
        requestId: expect.any(String),
        userId: 'user-1',
        type: 'stream.create',
        payload: {
          title: 'Launch stream',
          description: 'Demo',
        },
      }),
    );
  });
});
```

- [ ] **Step 2: Run use-case test and confirm it fails**

Run: `pnpm test -- --runInBand src/modules/streams/application/use-cases/create-stream.use-case.spec.ts`

Expected: FAIL with module-not-found errors.

- [ ] **Step 3: Add stream input/output types**

Write `src/modules/streams/application/dto/create-stream.input.ts`:

```typescript
export interface CreateStreamInput {
  userId: string;
  title: string;
  description?: string;
}

export interface CreateStreamPayload {
  title: string;
  description?: string;
}

export interface CreateStreamOutput {
  streamId: string;
  status: 'created';
}
```

- [ ] **Step 4: Add create stream use case**

Write `src/modules/streams/application/use-cases/create-stream.use-case.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { STREAM_TOPICS } from '@/infrastructure/kafka/kafka.constants';
import { KafkaGatewayService } from '@/infrastructure/kafka/kafka-gateway.service';
import {
  CreateStreamInput,
  CreateStreamOutput,
  CreateStreamPayload,
} from '../dto/create-stream.input';

@Injectable()
export class CreateStreamUseCase {
  constructor(private readonly kafka: KafkaGatewayService) {}

  execute(input: CreateStreamInput): Promise<CreateStreamOutput> {
    return this.kafka.request<CreateStreamOutput, CreateStreamPayload>(
      STREAM_TOPICS.commands,
      {
        requestId: randomUUID(),
        userId: input.userId,
        type: 'stream.create',
        payload: {
          title: input.title,
          description: input.description,
        },
      },
    );
  }
}
```

- [ ] **Step 5: Add reusable JWT guard and tests**

Write `src/shared/presentation/guards/jwt-auth.guard.spec.ts`:

```typescript
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

function contextWithAuthHeader(value?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: value ? { authorization: value } : {},
      }),
    }),
  } as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('rejects requests without a bearer token', async () => {
    const guard = new JwtAuthGuard(new JwtService({ secret: 'secret' }));

    await expect(guard.canActivate(contextWithAuthHeader())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('attaches the verified JWT payload to the request', async () => {
    const jwt = new JwtService({ secret: 'secret' });
    const token = await jwt.signAsync({ sub: 'user-1' });
    const request = { headers: { authorization: `Bearer ${token}` } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
    const guard = new JwtAuthGuard(jwt);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request).toEqual(
      expect.objectContaining({ user: expect.objectContaining({ sub: 'user-1' }) }),
    );
  });
});
```

Write `src/shared/presentation/guards/jwt-auth.guard.ts`:

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request.headers?.authorization);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      request.user = await this.jwt.verifyAsync(token);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private extractToken(authorization: unknown): string | null {
    if (typeof authorization !== 'string') {
      return null;
    }

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
```

- [ ] **Step 6: Add HTTP DTO and controller**

Write `src/modules/streams/presentation/http/dto/create-stream.request.ts`:

```typescript
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStreamRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
```

Write `src/modules/streams/presentation/http/streams.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '@/shared/presentation/guards/jwt-auth.guard';
import { CreateStreamUseCase } from '../../application/use-cases/create-stream.use-case';
import { CreateStreamRequest } from './dto/create-stream.request';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
  };
}

@Controller('streams')
export class StreamsController {
  constructor(private readonly createStream: CreateStreamUseCase) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() body: CreateStreamRequest, @Req() request: AuthenticatedRequest) {
    return this.createStream.execute({
      userId: request.user.sub,
      title: body.title,
      description: body.description,
    });
  }
}
```

- [ ] **Step 7: Add controller test**

Write `src/modules/streams/presentation/http/streams.controller.spec.ts`:

```typescript
import { StreamsController } from './streams.controller';

describe('StreamsController', () => {
  it('passes the authenticated user to the use case', async () => {
    const useCase = {
      execute: jest.fn().mockResolvedValue({
        streamId: 'stream-1',
        status: 'created',
      }),
    };
    const controller = new StreamsController(useCase as never);

    await expect(
      controller.create(
        { title: 'Launch stream', description: 'Demo' },
        { user: { sub: 'user-1' } } as never,
      ),
    ).resolves.toEqual({ streamId: 'stream-1', status: 'created' });

    expect(useCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      title: 'Launch stream',
      description: 'Demo',
    });
  });
});
```

- [ ] **Step 8: Add streams module and module index**

Write `src/modules/streams/streams.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { KafkaModule } from '@/infrastructure/kafka/kafka.module';
import { SecretModule } from '@/infrastructure/secret';
import { IAdapterSecret } from '@/infrastructure/secret/adapter';
import { CreateStreamUseCase } from './application/use-cases/create-stream.use-case';
import { StreamsController } from './presentation/http/streams.controller';
import { JwtAuthGuard } from '@/shared/presentation/guards/jwt-auth.guard';

@Module({
  imports: [
    KafkaModule,
    JwtModule.registerAsync({
      imports: [SecretModule],
      inject: [IAdapterSecret],
      useFactory: (secrets: IAdapterSecret) => ({
        secret: secrets.JWT_SECRET,
        signOptions: { expiresIn: secrets.TOKEN_EXPIRATION },
      }),
    }),
  ],
  controllers: [StreamsController],
  providers: [CreateStreamUseCase, JwtAuthGuard],
})
export class StreamsModule {}
```

Write `src/modules/index.ts`:

```typescript
import { Module } from '@nestjs/common';
import { StreamsModule } from './streams/streams.module';

@Module({
  imports: [StreamsModule],
})
export class ContainerModules {}
```

- [ ] **Step 9: Add streams E2E test**

Write `test/streams.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { CreateStreamUseCase } from '../src/modules/streams/application/use-cases/create-stream.use-case';
import { StreamsController } from '../src/modules/streams/presentation/http/streams.controller';
import { JwtAuthGuard } from '../src/shared/presentation/guards/jwt-auth.guard';
import { ValidationPipe } from '../src/shared/presentation/validation/validation.pipe';

describe('streams gateway (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const createStream = { execute: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      controllers: [StreamsController],
      providers: [
        JwtAuthGuard,
        { provide: CreateStreamUseCase, useValue: createStream },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    jwt = module.get(JwtService);
  });

  afterAll(async () => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('rejects stream creation without a token', async () => {
    await request(app.getHttpServer())
      .post('/api/streams')
      .send({ title: 'Launch stream' })
      .expect(401);

    expect(createStream.execute).not.toHaveBeenCalled();
  });

  it('rejects invalid request bodies before publishing commands', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' });

    await request(app.getHttpServer())
      .post('/api/streams')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '' })
      .expect(400);

    expect(createStream.execute).not.toHaveBeenCalled();
  });

  it('passes the verified owner identity to the use case', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' });
    createStream.execute.mockResolvedValue({
      streamId: 'stream-1',
      status: 'created',
    });

    await request(app.getHttpServer())
      .post('/api/streams')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Launch stream', description: 'Demo' })
      .expect(201);

    expect(createStream.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      title: 'Launch stream',
      description: 'Demo',
    });
  });
});
```

- [ ] **Step 10: Run streams tests**

Run: `pnpm test -- --runInBand src/shared/presentation/guards/jwt-auth.guard.spec.ts src/modules/streams`

Expected: PASS.

Run: `pnpm test:e2e -- --runInBand test/streams.e2e-spec.ts`

Expected: PASS.

- [ ] **Step 11: Commit streams gateway module**

```bash
git add src/shared/presentation/guards src/modules/streams src/modules/index.ts test/streams.e2e-spec.ts
git commit -m "feat(streams): add kafka gateway endpoint"
```

### Task 5: Remove Files, Database, And Storage Ownership

**Files:**
- Delete: `src/modules/files/**`
- Delete: `src/infrastructure/database/**`
- Delete: `src/infrastructure/config/database.config.ts`
- Delete: `mikro-orm.config.js`
- Delete: `scripts/create-migration.js`
- Delete: `scripts/run-seeder.js`
- Delete: `test/files.e2e-spec.ts`
- Modify: `src/app.module.ts`
- Modify: `src/infrastructure/secret/adapter.ts`
- Modify: `src/infrastructure/secret/service.ts`
- Modify: `src/infrastructure/secret/service.spec.ts`
- Modify: `.env.example`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `StreamsModule`, `HealthModule`, `SecretModule`, and `WinstonModule`.
- Produces: a gateway app with no file module, database module, storage adapter, ORM config, or migration scripts.

- [ ] **Step 1: Verify legacy references before deletion**

Run: `rg -n "modules/files|FilesModule|MikroOrm|mikro-orm|POSTGRES|DB_|ServeStatic|storages|sharp|FileController|UploadFileUseCase|GetPrivateFileUseCase" src test package.json Dockerfile docker-compose.yml README.md`

Expected: matches exist only in files that this task or Task 6 will modify/delete.

- [ ] **Step 2: Replace `src/app.module.ts`**

Write `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { SecretModule } from '@/infrastructure/secret';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from '@/infrastructure/config/logger.config';
import { ContainerModules } from './modules';
import { AppController } from './app.controller';
import { DebugController } from './debug.controller';
import { HealthModule } from '@/infrastructure/health/health.module';

const controllers =
  process.env.NODE_ENV === 'development' &&
  process.env.ENABLE_DEBUG_ROUTES === 'true'
    ? [AppController, DebugController]
    : [AppController];

@Module({
  imports: [
    WinstonModule.forRoot(winstonConfig),
    SecretModule,
    HealthModule,
    ContainerModules,
  ],
  controllers,
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 3: Delete legacy source and test files**

Run:

```powershell
Remove-Item -Recurse -Force src/modules/files
Remove-Item -Recurse -Force src/infrastructure/database
Remove-Item -Force src/infrastructure/config/database.config.ts
Remove-Item -Force mikro-orm.config.js
Remove-Item -Force scripts/create-migration.js
Remove-Item -Force scripts/run-seeder.js
Remove-Item -Force test/files.e2e-spec.ts
```

Expected: the files are removed from the working tree.

- [ ] **Step 4: Remove database and storage dependencies/scripts**

Run:

```bash
pnpm remove @mikro-orm/core @mikro-orm/decorators @mikro-orm/migrations @mikro-orm/nestjs @mikro-orm/postgresql @mikro-orm/cli pg sharp nestjs-paginate @types/multer
```

Then remove these scripts from `package.json`:

```json
"migration:create": "node scripts/create-migration.js",
"migration:up": "pnpm build && mikro-orm migration:up",
"migration:down": "pnpm build && mikro-orm migration:down",
"seed:run": "pnpm build && node scripts/run-seeder.js"
```

Remove the `mikro-orm` config block from `package.json`.

- [ ] **Step 5: Remove database fields from gateway config**

Write `src/infrastructure/secret/adapter.ts`:

```typescript
export abstract class IAdapterSecret {
  abstract APP_NAME: string;
  abstract APP_PORT: number;

  abstract KAFKA_BROKERS: string[];
  abstract KAFKA_CLIENT_ID: string;
  abstract KAFKA_GROUP_ID: string;

  abstract JWT_SECRET: string;
  abstract TOKEN_EXPIRATION: string;
}
```

Write `src/infrastructure/secret/service.ts`:

```typescript
import { ConfigService } from '@nestjs/config';
import { IAdapterSecret } from './adapter';

export class SecretService extends ConfigService implements IAdapterSecret {
  APP_NAME = this.required('APP_NAME');
  APP_PORT = this.readPort();

  KAFKA_BROKERS = this.readList('KAFKA_BROKERS');
  KAFKA_CLIENT_ID = this.required('KAFKA_CLIENT_ID');
  KAFKA_GROUP_ID = this.required('KAFKA_GROUP_ID');

  JWT_SECRET = this.required('JWT_SECRET');
  TOKEN_EXPIRATION = this.required('TOKEN_EXPIRATION');

  private required(name: string): string {
    const value = this.get<string>(name);
    if (!value) throw new Error(`${name} is required`);
    return value;
  }

  private readList(name: string): string[] {
    const values = this.required(name)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (values.length === 0) {
      throw new Error(`${name} is required`);
    }

    return values;
  }

  private readPort(): number {
    const port = Number(this.required('APP_PORT'));
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('APP_PORT must be a valid port');
    }
    return port;
  }
}
```

Write `.env.example`:

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

Write `src/infrastructure/secret/service.spec.ts`:

```typescript
import { SecretService } from './service';

describe('SecretService', () => {
  const names = [
    'APP_NAME',
    'APP_PORT',
    'KAFKA_BROKERS',
    'KAFKA_CLIENT_ID',
    'KAFKA_GROUP_ID',
    'JWT_SECRET',
    'TOKEN_EXPIRATION',
  ] as const;

  const original = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );

  beforeEach(() => {
    Object.assign(process.env, {
      APP_NAME: 'api-gateway',
      APP_PORT: '3000',
      KAFKA_BROKERS: 'localhost:9092, kafka:9092 ',
      KAFKA_CLIENT_ID: 'api-gateway',
      KAFKA_GROUP_ID: 'api-gateway',
      JWT_SECRET: 'test-secret',
      TOKEN_EXPIRATION: '1d',
    });
  });

  afterAll(() => {
    for (const name of names) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  });

  it('parses the HTTP port as a number', () => {
    expect(new SecretService().APP_PORT).toBe(3000);
  });

  it('parses Kafka brokers into a trimmed list', () => {
    expect(new SecretService().KAFKA_BROKERS).toEqual([
      'localhost:9092',
      'kafka:9092',
    ]);
  });

  it('rejects a missing JWT secret', () => {
    process.env.JWT_SECRET = '';
    expect(() => new SecretService()).toThrow('JWT_SECRET is required');
  });

  it('rejects an invalid port', () => {
    process.env.APP_PORT = 'abc';
    expect(() => new SecretService()).toThrow('APP_PORT must be a valid port');
  });

  it('rejects an empty Kafka broker list', () => {
    process.env.KAFKA_BROKERS = ' , ';
    expect(() => new SecretService()).toThrow('KAFKA_BROKERS is required');
  });
});
```

- [ ] **Step 6: Verify no legacy references remain in source/tests/package**

Run: `rg -n "modules/files|FilesModule|MikroOrm|mikro-orm|POSTGRES|DB_|ServeStatic|storages|sharp|nestjs-paginate|multer|FileController|UploadFileUseCase|GetPrivateFileUseCase" src test package.json`

Expected: no matches.

- [ ] **Step 7: Run build-facing checks**

Run: `pnpm test -- --runInBand src/infrastructure/secret src/infrastructure/kafka src/infrastructure/health src/modules/streams src/shared/presentation/guards`

Expected: PASS.

Run: `pnpm build`

Expected: PASS.

- [ ] **Step 8: Commit ownership removal**

```bash
git add .env.example package.json pnpm-lock.yaml src test scripts mikro-orm.config.js
git commit -m "refactor: remove gateway-owned file storage"
```

### Task 6: Docker Compose And Documentation

**Files:**
- Modify: `docker-compose.yml`
- Modify: `Dockerfile`
- Modify: `README.md`

**Interfaces:**
- Consumes: `APP_PORT`, `KAFKA_BROKERS`, and `GET /health/live`.
- Produces: local Compose stack with `api-gateway` and Kafka broker only.

- [ ] **Step 1: Replace Docker Compose**

Write `docker-compose.yml`:

```yaml
services:
  api-gateway:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    depends_on:
      kafka:
        condition: service_started
    environment:
      APP_NAME: api-gateway
      APP_PORT: 3000
      NODE_ENV: production
      KAFKA_BROKERS: kafka:9092
      KAFKA_CLIENT_ID: api-gateway
      KAFKA_GROUP_ID: api-gateway
      JWT_SECRET: local-secret
      TOKEN_EXPIRATION: 1000d
    ports:
      - '3000:3000'
    healthcheck:
      test:
        [
          'CMD-SHELL',
          'node -e "fetch(''http://127.0.0.1:3000/health/live'').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"',
        ]
      interval: 10s
      timeout: 5s
      retries: 5

  kafka:
    image: bitnami/kafka:3.7
    ports:
      - '9092:9092'
      - '9094:9094'
    environment:
      ALLOW_PLAINTEXT_LISTENER: 'yes'
      KAFKA_CFG_NODE_ID: 1
      KAFKA_CFG_PROCESS_ROLES: broker,controller
      KAFKA_CFG_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_CFG_LISTENERS: PLAINTEXT://:9092,EXTERNAL://:9094,CONTROLLER://:9093
      KAFKA_CFG_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,EXTERNAL://localhost:9094
      KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,EXTERNAL:PLAINTEXT,CONTROLLER:PLAINTEXT
      KAFKA_CFG_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE: 'true'
```

- [ ] **Step 2: Simplify Dockerfile copy expectations**

Keep the existing multi-stage build, but remove `mikro-orm.config.js` from the runner copy line. The runner stage should contain:

```dockerfile
COPY package.json ./
```

and should not create `./storages`.

- [ ] **Step 3: Rewrite README**

Replace `README.md` with these sections:

- `# API Gateway`
- A short opening paragraph: "This NestJS service is the client-facing API Gateway for the stream microservice system."
- `## Runtime Model`: explain that client traffic enters through HTTP, gateway modules validate/authenticate requests, and business work is sent to Kafka.
- `## Kafka Conventions`: document `stream.commands`, `stream.events`, and `stream.replies`.
- `## Command Envelope`: include this JSON example:

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

- `## Local Development`: include `pnpm install`, `Copy-Item .env.example .env`, and `pnpm start:dev`.
- `## Docker`: include `docker compose up -d --build`, `docker compose ps`, `docker compose logs -f api-gateway`, and `docker compose down`.
- `## Project Structure`: show the actual gateway directories after this refactor.
- `## Testing And Quality`: include `pnpm test -- --runInBand`, `pnpm test:e2e -- --runInBand`, `pnpm lint`, and `pnpm build`.

State that the gateway is available at `http://localhost:3000` and health endpoints are `GET /health/live` and `GET /health/ready`.

- [ ] **Step 4: Check docs for stale legacy references**

Run: `rg -n "files|upload|MikroORM|PostgreSQL|migration|storages|sharp|postgis|migrator" README.md docker-compose.yml Dockerfile`

Expected: no stale references to the removed files feature, database, migrations, or storage.

- [ ] **Step 5: Validate Compose and docs**

Run: `docker compose config`

Expected: Compose config is valid.

Run: `git diff --check -- README.md docker-compose.yml Dockerfile`

Expected: no whitespace errors.

- [ ] **Step 6: Commit Docker and docs**

```bash
git add README.md docker-compose.yml Dockerfile
git commit -m "docs: describe kafka api gateway"
```

### Task 7: Full Regression

**Files:**
- Modify only files changed by earlier tasks if verification reveals a defect.

**Interfaces:**
- Verifies the gateway refactor end to end.

- [ ] **Step 1: Run source stale-reference check**

Run: `rg -n "modules/files|FilesModule|MikroOrm|mikro-orm|POSTGRES|DB_|ServeStatic|storages|sharp|nestjs-paginate|multer|FileController|UploadFileUseCase|GetPrivateFileUseCase" src test package.json README.md Dockerfile docker-compose.yml`

Expected: no matches.

- [ ] **Step 2: Run unit tests**

Run: `pnpm test -- --runInBand`

Expected: PASS.

- [ ] **Step 3: Run E2E tests**

Run: `pnpm test:e2e -- --runInBand`

Expected: PASS.

- [ ] **Step 4: Run lint and build**

Run: `pnpm lint`

Expected: PASS.

Run: `pnpm build`

Expected: PASS.

- [ ] **Step 5: Run formatting check**

Run: `pnpm exec prettier --check "src/**/*.ts" "test/**/*.ts" README.md docker-compose.yml Dockerfile`

Expected: PASS.

- [ ] **Step 6: Validate Docker Compose**

Run: `docker compose config`

Expected: PASS.

- [ ] **Step 7: Optional local stack verification**

Run: `docker compose up -d --build`

Expected: `api-gateway` starts and Kafka starts.

Run: `Invoke-WebRequest -UseBasicParsing http://localhost:3000/health/live | Select-Object StatusCode, Content`

Expected: HTTP 200 with `{"status":"ok"}` or the existing success envelope around that data if the global success interceptor is active.

- [ ] **Step 8: Commit final verification fixes if needed**

If verification required a scoped fix, run `git status --short`, stage only the
files changed by that fix, and commit with `git commit -m "fix: complete kafka
gateway verification"`. If no correction was required, do not create an empty
commit.
