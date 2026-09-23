import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { GetPrivateFileUseCase } from '../src/modules/files/application/use-cases/get-private-file.use-case';
import { UploadFileUseCase } from '../src/modules/files/application/use-cases/upload-file.use-case';
import { FileController } from '../src/modules/files/presentation/http/file.controller';
import { JwtAuthGuard } from '../src/modules/files/presentation/http/guards/jwt-auth.guard';

jest.mock('uuid', () => ({
  v7: () => '0196d7fa-9752-7048-baf4-de9c43877a67',
}));

describe('file access (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const upload = { execute: jest.fn() };
  const privateFile = { execute: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      controllers: [FileController],
      providers: [
        JwtAuthGuard,
        { provide: UploadFileUseCase, useValue: upload },
        { provide: GetPrivateFileUseCase, useValue: privateFile },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    jwt = module.get(JwtService);
  });

  afterAll(async () => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('rejects private reads without a token', async () => {
    await request(app.getHttpServer())
      .get('/api/files/0196d7fa-9752-7048-baf4-de9c43877a67')
      .expect(401);
    expect(privateFile.execute).not.toHaveBeenCalled();
  });

  it('passes the verified owner identity to private reads', async () => {
    const token = await jwt.signAsync({ sub: 'user-a' });
    privateFile.execute.mockResolvedValue({
      stream: Buffer.from('private-file'),
      contentType: 'image/webp',
      contentLength: 12,
    });

    const response = await request(app.getHttpServer())
      .get('/api/files/0196d7fa-9752-7048-baf4-de9c43877a67')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.toString()).toBe('private-file');
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(privateFile.execute).toHaveBeenCalledWith({
      id: '0196d7fa-9752-7048-baf4-de9c43877a67',
      userId: 'user-a',
    });
  });

  it('binds uploads to the verified user and defaults to private', async () => {
    const token = await jwt.signAsync({ sub: 'user-a' });
    upload.execute.mockResolvedValue({ id: 'file-id', visibility: 'private' });

    await request(app.getHttpServer())
      .post('/api/files')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('image'), 'image.png')
      .expect(201);

    expect(upload.execute).toHaveBeenCalledWith({
      file: expect.objectContaining({ mimetype: 'image/png' }),
      ownerId: 'user-a',
      visibility: 'private',
    });
  });
});
