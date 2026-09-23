import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as request from 'supertest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../src/app.module';

jest.mock('../src/infrastructure/database/database.module', () => ({
  DatabaseModule: class DatabaseModule {},
}));
jest.mock('../src/modules/files/files.module', () => ({
  FilesModule: class FilesModule {},
}));

describe('AppController (e2e)', () => {
  let app: INestApplication;
  const storage = path.join(process.cwd(), 'storages');
  const publicDir = path.join(storage, 'public');
  const privateDir = path.join(storage, 'private');
  const createdPublicDir = !fs.existsSync(publicDir);
  const createdPrivateDir = !fs.existsSync(privateDir);
  const publicName = `public-test-${randomUUID()}.txt`;
  const privateName = `private-test-${randomUUID()}.txt`;

  beforeAll(async () => {
    fs.mkdirSync(publicDir, { recursive: true });
    fs.mkdirSync(privateDir, { recursive: true });
    fs.writeFileSync(path.join(publicDir, publicName), 'public data');
    fs.writeFileSync(path.join(privateDir, privateName), 'private data');
    app = await NestFactory.create(AppModule, { logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    fs.unlinkSync(path.join(publicDir, publicName));
    fs.unlinkSync(path.join(privateDir, privateName));
    if (createdPublicDir) fs.rmdirSync(publicDir);
    if (createdPrivateDir) fs.rmdirSync(privateDir);
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World');
  });

  it('serves only files in the public directory', async () => {
    await request(app.getHttpServer())
      .get(`/assets/${publicName}`)
      .expect(200, 'public data');
    await request(app.getHttpServer())
      .get(`/assets/${privateName}`)
      .expect(404);
  });
});
