import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthTables20260925000000 implements MigrationInterface {
  name = 'CreateAuthTables20260925000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(320) NOT NULL,
        "emailVerified" boolean NOT NULL DEFAULT false,
        "displayName" varchar(120),
        "avatarUrl" varchar(2048),
        "passwordHash" varchar(255),
        "status" varchar(32) NOT NULL DEFAULT 'pending_verification',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "auth_identities" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "provider" varchar(32) NOT NULL,
        "providerUserId" varchar(255) NOT NULL,
        "providerEmail" varchar(320),
        "providerEmailVerified" boolean NOT NULL DEFAULT false,
        "metadata" jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_auth_identities_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_auth_identities_provider_user" UNIQUE ("provider", "providerUserId"),
        CONSTRAINT "UQ_auth_identities_user_provider" UNIQUE ("user_id", "provider")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "auth_refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "tokenHash" varchar(64) NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        "revokedAt" timestamptz,
        "replacedByTokenId" uuid,
        "userAgent" varchar(512),
        "ipAddress" varchar(64),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_auth_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_auth_refresh_tokens_hash" UNIQUE ("tokenHash")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "auth_email_verifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "email" varchar(320) NOT NULL,
        "codeHash" varchar(64) NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        "consumedAt" timestamptz,
        "invalidatedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_auth_email_verifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_auth_email_verifications_email_code" ON "auth_email_verifications" ("email", "codeHash")
    `);
    await queryRunner.query(`
      CREATE TABLE "outbox_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "aggregateType" varchar(64) NOT NULL,
        "aggregateId" uuid NOT NULL,
        "type" varchar(120) NOT NULL,
        "payload" jsonb NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'pending',
        "processedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_outbox_events_status_created_at" ON "outbox_events" ("status", "createdAt")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "outbox_events"');
    await queryRunner.query('DROP TABLE "auth_email_verifications"');
    await queryRunner.query('DROP TABLE "auth_refresh_tokens"');
    await queryRunner.query('DROP TABLE "auth_identities"');
    await queryRunner.query('DROP TABLE "users"');
  }
}
