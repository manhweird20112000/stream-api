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
