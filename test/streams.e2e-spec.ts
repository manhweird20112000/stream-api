import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import {
  KafkaGatewayDownstreamError,
  KafkaGatewayTimeoutError,
} from '../src/infrastructure/kafka/kafka.errors';
import { CreateStreamKeyUseCase } from '../src/modules/streams/application/use-cases/create-stream-key.use-case';
import { CreateStreamUseCase } from '../src/modules/streams/application/use-cases/create-stream.use-case';
import { VerifyStreamKeyUseCase } from '../src/modules/streams/application/use-cases/verify-stream-key.use-case';
import {
  DeleteStreamUseCase,
  EndStreamUseCase,
  GetStreamUseCase,
  ListPublicLiveStreamsUseCase,
  ListStreamsUseCase,
  PublishStreamUseCase,
  UpdateStreamUseCase,
} from '../src/modules/streams/application/use-cases/stream-crud.use-cases';
import { StreamsController } from '../src/modules/streams/presentation/http/streams.controller';
import { HttpExceptionFilter } from '../src/shared/presentation/filters/http-exception.filter';
import { JwtAuthGuard } from '../src/shared/presentation/guards/jwt-auth.guard';
import { ValidationPipe } from '../src/shared/presentation/validation/validation.pipe';

describe('streams gateway (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const createStream = { execute: jest.fn() };
  const createStreamKey = { execute: jest.fn() };
  const verifyStreamKey = { execute: jest.fn() };
  const listStreams = { execute: jest.fn() };
  const listPublicLiveStreams = { execute: jest.fn() };
  const getStream = { execute: jest.fn() };
  const updateStream = { execute: jest.fn() };
  const publishStream = { execute: jest.fn() };
  const endStream = { execute: jest.fn() };
  const deleteStream = { execute: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      controllers: [StreamsController],
      providers: [
        JwtAuthGuard,
        { provide: CreateStreamUseCase, useValue: createStream },
        { provide: CreateStreamKeyUseCase, useValue: createStreamKey },
        { provide: VerifyStreamKeyUseCase, useValue: verifyStreamKey },
        { provide: ListStreamsUseCase, useValue: listStreams },
        { provide: ListPublicLiveStreamsUseCase, useValue: listPublicLiveStreams },
        { provide: GetStreamUseCase, useValue: getStream },
        { provide: UpdateStreamUseCase, useValue: updateStream },
        { provide: PublishStreamUseCase, useValue: publishStream },
        { provide: EndStreamUseCase, useValue: endStream },
        { provide: DeleteStreamUseCase, useValue: deleteStream },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new HttpExceptionFilter());
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
      .send({
        title: 'Launch stream',
        description: 'Demo',
        thumbnailUrl: 'https://cdn.example.com/streams/launch.jpg',
        visibility: 'PUBLIC',
      })
      .expect(201);

    expect(createStream.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      title: 'Launch stream',
      description: 'Demo',
      thumbnailUrl: 'https://cdn.example.com/streams/launch.jpg',
      visibility: 'PUBLIC',
    });
  });

  it('generates a stream key for the verified owner identity', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' });
    createStreamKey.execute.mockResolvedValue({ success: true });

    const response = await request(app.getHttpServer())
      .post('/api/streams/keys')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(response.body).toEqual({ success: true });
    expect(response.body).not.toHaveProperty('key');
    expect(response.body).not.toHaveProperty('keyPrefix');
    expect(createStreamKey.execute).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
    });
  });

  it('refreshes a stream key for the verified owner identity', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' });
    createStreamKey.execute.mockResolvedValue({ success: true });

    const response = await request(app.getHttpServer())
      .post('/api/streams/keys/refresh')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(response.body).toEqual({ success: true });
    expect(response.body).not.toHaveProperty('key');
    expect(response.body).not.toHaveProperty('keyPrefix');
    expect(createStreamKey.execute).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      refresh: true,
    });
  });

  it('verifies a stream key without a bearer token', async () => {
    verifyStreamKey.execute.mockResolvedValue({
      valid: true,
      ownerUserId: 'user-1',
      streamKeyId: 'key-1',
    });

    const response = await request(app.getHttpServer())
      .post('/api/streams/keys/verify')
      .send({ streamKey: 'sk_valid-stream-key' })
      .expect(200);

    expect(response.body).toEqual({
      valid: true,
      ownerUserId: 'user-1',
      streamKeyId: 'key-1',
    });
    expect(verifyStreamKey.execute).toHaveBeenCalledWith({
      streamKey: 'sk_valid-stream-key',
    });
  });

  it('lists streams for the verified owner identity', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' });
    listStreams.execute.mockResolvedValue([
      {
        id: 'stream-1',
        title: 'Launch stream',
        description: 'Demo',
        thumbnailUrl: null,
        visibility: 'PRIVATE',
        status: 'CREATED',
        createdAt: new Date('2026-09-26T00:00:00.000Z'),
        updatedAt: new Date('2026-09-26T00:00:00.000Z'),
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/streams')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      items: [
        {
          id: 'stream-1',
          title: 'Launch stream',
          description: 'Demo',
          thumbnailUrl: null,
          visibility: 'PRIVATE',
          status: 'CREATED',
          createdAt: '2026-09-26T00:00:00.000Z',
          updatedAt: '2026-09-26T00:00:00.000Z',
        },
      ],
      meta: {
        limit: 20,
        hasNextPage: false,
        nextCursor: null,
      },
    });
    expect(listStreams.execute).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      limit: 21,
      cursor: undefined,
    });
  });

  it('lists public live streams without a bearer token', async () => {
    listPublicLiveStreams.execute.mockResolvedValue([
      {
        id: 'stream-1',
        title: 'Launch stream',
        description: 'Demo',
        thumbnailUrl: null,
        visibility: 'PUBLIC',
        status: 'LIVE',
        createdAt: new Date('2026-09-26T00:00:00.000Z'),
        updatedAt: new Date('2026-09-26T00:00:00.000Z'),
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/streams/live')
      .expect(200);

    expect(response.body).toEqual({
      items: [
        {
          id: 'stream-1',
          title: 'Launch stream',
          description: 'Demo',
          thumbnailUrl: null,
          visibility: 'PUBLIC',
          status: 'LIVE',
          createdAt: '2026-09-26T00:00:00.000Z',
          updatedAt: '2026-09-26T00:00:00.000Z',
        },
      ],
      meta: {
        limit: 20,
        hasNextPage: false,
        nextCursor: null,
      },
    });
    expect(listPublicLiveStreams.execute).toHaveBeenCalledWith({
      limit: 21,
      cursor: undefined,
    });
  });

  it('gets a stream for the verified owner identity', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' });
    getStream.execute.mockResolvedValue({
      id: 'stream-1',
      title: 'Launch stream',
      description: 'Demo',
      thumbnailUrl: null,
      visibility: 'PRIVATE',
      status: 'CREATED',
      createdAt: new Date('2026-09-26T00:00:00.000Z'),
      updatedAt: new Date('2026-09-26T00:00:00.000Z'),
    });

    const response = await request(app.getHttpServer())
      .get('/api/streams/stream-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.id).toBe('stream-1');
    expect(getStream.execute).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      streamId: 'stream-1',
    });
  });

  it('updates a stream for the verified owner identity', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' });
    updateStream.execute.mockResolvedValue({
      id: 'stream-1',
      title: 'Updated stream',
      description: null,
      thumbnailUrl: 'https://cdn.example.com/streams/updated.jpg',
      visibility: 'PUBLIC',
      status: 'CREATED',
      createdAt: new Date('2026-09-26T00:00:00.000Z'),
      updatedAt: new Date('2026-09-26T00:00:00.000Z'),
    });

    const response = await request(app.getHttpServer())
      .patch('/api/streams/stream-1')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Updated stream',
        description: null,
        thumbnailUrl: 'https://cdn.example.com/streams/updated.jpg',
        visibility: 'PUBLIC',
      })
      .expect(200);

    expect(response.body.title).toBe('Updated stream');
    expect(updateStream.execute).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      streamId: 'stream-1',
      title: 'Updated stream',
      description: null,
      thumbnailUrl: 'https://cdn.example.com/streams/updated.jpg',
      visibility: 'PUBLIC',
    });
  });

  it('publishes a stream for the verified owner identity', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' });
    publishStream.execute.mockResolvedValue({
      id: 'stream-1',
      title: 'Launch stream',
      description: 'Demo',
      thumbnailUrl: null,
      visibility: 'PRIVATE',
      status: 'LIVE',
      createdAt: new Date('2026-09-26T00:00:00.000Z'),
      updatedAt: new Date('2026-09-26T00:00:00.000Z'),
    });

    const response = await request(app.getHttpServer())
      .post('/api/streams/stream-1/publish')
      .set('Authorization', `Bearer ${token}`)
      .send({ publisherIp: '127.0.0.1' })
      .expect(200);

    expect(response.body.status).toBe('LIVE');
    expect(publishStream.execute).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      streamId: 'stream-1',
      publisherIp: '127.0.0.1',
    });
  });

  it('ends a stream for the verified owner identity', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' });
    endStream.execute.mockResolvedValue({
      id: 'stream-1',
      title: 'Launch stream',
      description: 'Demo',
      thumbnailUrl: null,
      visibility: 'PRIVATE',
      status: 'ENDED',
      createdAt: new Date('2026-09-26T00:00:00.000Z'),
      updatedAt: new Date('2026-09-26T00:00:00.000Z'),
    });

    const response = await request(app.getHttpServer())
      .post('/api/streams/stream-1/end')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.status).toBe('ENDED');
    expect(endStream.execute).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      streamId: 'stream-1',
    });
  });

  it('deletes a stream for the verified owner identity', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' });
    deleteStream.execute.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .delete('/api/streams/stream-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    expect(deleteStream.execute).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      streamId: 'stream-1',
    });
  });

  it('maps downstream Kafka timeouts to gateway timeout responses', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' });
    createStream.execute.mockRejectedValue(new KafkaGatewayTimeoutError());

    const response = await request(app.getHttpServer())
      .post('/api/streams')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Launch stream', description: 'Demo' })
      .expect(504);

    expect(response.body).toEqual({
      status_code: 504,
      message: 'Downstream service timed out',
      data: { code: 'DOWNSTREAM_TIMEOUT' },
    });
  });

  it('maps downstream Kafka errors without exposing raw downstream messages', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' });
    createStream.execute.mockRejectedValue(
      new KafkaGatewayDownstreamError(
        'STREAM_LIMIT_REACHED',
        'internal secret',
      ),
    );

    const response = await request(app.getHttpServer())
      .post('/api/streams')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Launch stream', description: 'Demo' })
      .expect(502);

    expect(response.body).toEqual({
      status_code: 502,
      message: 'Downstream service error',
      data: { code: 'STREAM_LIMIT_REACHED' },
    });
    expect(JSON.stringify(response.body)).not.toContain('internal secret');
  });
});
