# Kafka Kong Basics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the basic NestJS Kafka microservice bootstrap and document how this service uses the shared Kafka/Kong stack.

**Architecture:** Keep the app as a hybrid Nest application: HTTP endpoints remain available for Kong, while the same app also connects a Kafka transporter for future `@MessagePattern` and `@EventPattern` handlers. Reuse the existing `IAdapterSecret` configuration and existing Kafka gateway client.

**Tech Stack:** NestJS 11, `@nestjs/microservices`, KafkaJS, Docker Compose, Kong declarative config.

## Global Constraints

- Keep the diff small and reuse existing Kafka infrastructure.
- Do not add new runtime dependencies.
- Kong is provided by the shared root stack and proxies HTTP to `stream-service:3000`.
- Kafka is provided by the shared root stack and is used for service communication.
- Use `KAFKA_BROKERS`, `KAFKA_CLIENT_ID`, and `KAFKA_GROUP_ID` as the single source of Kafka config.

---

### Task 1: Shared Kafka Options

**Files:**
- Create: `src/infrastructure/kafka/kafka.options.ts`
- Create: `src/infrastructure/kafka/kafka.options.spec.ts`
- Modify: `src/infrastructure/kafka/kafka.module.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `IAdapterSecret`
- Produces: `createKafkaOptions(secrets: IAdapterSecret): KafkaOptions`

- [ ] Add a failing test proving Kafka options are built from `IAdapterSecret`.
- [ ] Implement `createKafkaOptions`.
- [ ] Replace inline Kafka client config in `KafkaModule`.
- [ ] Connect the Kafka microservice in `main.ts` and call `startAllMicroservices()`.
- [ ] Run `pnpm test -- kafka.options.spec.ts --runInBand`.

### Task 2: Shared Kafka And Kong Documentation

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Kafka internal broker: `kafka:9092`
- Shared Docker network: `stream-net`

- [ ] Keep this service compose focused on `stream-service` and its local database.
- [ ] Keep `stream-service` attached to `stream-net` for shared Kafka/Kong access.
- [ ] Update docs and env examples if service-level defaults change.
- [ ] Run `pnpm build`, `pnpm test --runInBand`, and `pnpm lint`.

## Self-Review

- Scope covers Kafka microservice bootstrap and shared Kafka/Kong usage.
- No placeholder values are required; all ports and names are concrete local defaults.
- Types are consistent: `createKafkaOptions` returns Nest `KafkaOptions` and consumes the existing secret adapter.
