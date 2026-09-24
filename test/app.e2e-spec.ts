import { INestApplication, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as request from 'supertest';

jest.mock('@/infrastructure/health/health.module', () => ({
  HealthModule: (() => {
    class HealthModule {}
    Module({})(HealthModule);
    return HealthModule;
  })(),
}));

jest.mock('../src/modules', () => ({
  ContainerModules: (() => {
    class ContainerModules {}
    Module({})(ContainerModules);
    return ContainerModules;
  })(),
}));

import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  const env = {
    APP_NAME: process.env.APP_NAME,
    APP_PORT: process.env.APP_PORT,
    KAFKA_BROKERS: process.env.KAFKA_BROKERS,
    KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID,
    KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID,
    JWT_SECRET: process.env.JWT_SECRET,
    TOKEN_EXPIRATION: process.env.TOKEN_EXPIRATION,
  };

  beforeAll(async () => {
    Object.assign(process.env, {
      APP_NAME: 'api-gateway',
      APP_PORT: '3000',
      KAFKA_BROKERS: 'localhost:9092',
      KAFKA_CLIENT_ID: 'api-gateway',
      KAFKA_GROUP_ID: 'api-gateway',
      JWT_SECRET: 'test-secret',
      TOKEN_EXPIRATION: '1d',
    });
    app = await NestFactory.create(AppModule, { logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    for (const [name, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World');
  });
});
