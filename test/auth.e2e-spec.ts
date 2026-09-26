import { INestApplication, VersioningType } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { IAdapterSecret } from '../src/infrastructure/secret/adapter';
import { LoginWithPasswordUseCase } from '../src/modules/auth/application/use-cases/login-with-password.use-case';
import { LoginWithProviderUseCase } from '../src/modules/auth/application/use-cases/login-with-provider.use-case';
import { LogoutUseCase } from '../src/modules/auth/application/use-cases/logout.use-case';
import { RefreshSessionUseCase } from '../src/modules/auth/application/use-cases/refresh-session.use-case';
import { RegisterWithPasswordUseCase } from '../src/modules/auth/application/use-cases/register-with-password.use-case';
import { UpdateCurrentUserUseCase } from '../src/modules/auth/application/use-cases/update-current-user.use-case';
import { VerifyEmailUseCase } from '../src/modules/auth/application/use-cases/verify-email.use-case';
import { GetCurrentUserUseCase } from '../src/modules/auth/application/use-cases/get-current-user.use-case';
import { GoogleOAuthClient } from '../src/modules/auth/infrastructure/google-oauth.client';
import { AuthController } from '../src/modules/auth/presentation/http/auth.controller';
import { JwtAuthGuard } from '../src/shared/presentation/guards/jwt-auth.guard';
import { ValidationPipe } from '../src/shared/presentation/validation/validation.pipe';

describe('auth gateway (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;

  const login = { execute: jest.fn() };
  const register = { execute: jest.fn() };
  const verify = { execute: jest.fn() };
  const providerLogin = { execute: jest.fn() };
  const refresh = { execute: jest.fn() };
  const logout = { execute: jest.fn() };
  const me = { execute: jest.fn() };
  const updateMe = { execute: jest.fn() };
  const google = { createAuthorizationUrl: jest.fn(), exchangeCode: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      controllers: [AuthController],
      providers: [
        JwtAuthGuard,
        { provide: RegisterWithPasswordUseCase, useValue: register },
        { provide: VerifyEmailUseCase, useValue: verify },
        { provide: LoginWithPasswordUseCase, useValue: login },
        { provide: LoginWithProviderUseCase, useValue: providerLogin },
        { provide: RefreshSessionUseCase, useValue: refresh },
        { provide: LogoutUseCase, useValue: logout },
        { provide: GetCurrentUserUseCase, useValue: me },
        { provide: UpdateCurrentUserUseCase, useValue: updateMe },
        { provide: GoogleOAuthClient, useValue: google },
        {
          provide: IAdapterSecret,
          useValue: {
            AUTH_SUCCESS_REDIRECT_URL: 'http://localhost:3000/api/v1/auth/success',
            AUTH_FAILURE_REDIRECT_URL: 'http://localhost:3000/api/v1/auth/failure',
            REFRESH_TOKEN_EXPIRATION_DAYS: 30,
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    jwt = module.get(JwtService);
  });

  afterAll(async () => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('registers an email/password draft without setting a refresh cookie', async () => {
    register.execute.mockResolvedValue({
      email: 'owner@example.com',
      verificationRequired: true,
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'owner@example.com', password: 'secret123' })
      .expect(201);

    expect(response.body).toEqual({
      email: 'owner@example.com',
      verificationRequired: true,
    });
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('verifies email and sets the refresh token cookie', async () => {
    verify.execute.mockResolvedValue({
      accessToken: 'access-token-1',
      refreshToken: 'refresh-token-1',
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        displayName: null,
        avatarUrl: null,
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ email: 'owner@example.com', code: '123456' })
      .expect(201);

    expect(response.body).toEqual({
      accessToken: 'access-token-1',
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        displayName: null,
        avatarUrl: null,
      },
    });
    expect(response.headers['set-cookie'][0]).toContain('refresh_token=');
  });

  it('logs in and sets the refresh token cookie', async () => {
    login.execute.mockResolvedValue({
      accessToken: 'access-token-1',
      refreshToken: 'refresh-token-1',
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        displayName: null,
        avatarUrl: null,
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@example.com', password: 'secret123' })
      .expect(201);

    expect(response.body).toEqual({
      accessToken: 'access-token-1',
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        displayName: null,
        avatarUrl: null,
      },
    });
    expect(response.headers['set-cookie'][0]).toContain('refresh_token=');
  });

  it('rejects me without a token', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

    expect(me.execute).not.toHaveBeenCalled();
  });

  it('loads me from the verified JWT subject', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' });
    me.execute.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      displayName: 'Owner',
      avatarUrl: null,
    });

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(me.execute).toHaveBeenCalledWith('user-1');
  });

  it('updates me from the verified JWT subject', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' });
    updateMe.execute.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      displayName: 'Owner Name',
      avatarUrl: 'https://example.com/avatar.png',
    });

    const response = await request(app.getHttpServer())
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        displayName: 'Owner Name',
        avatarUrl: 'https://example.com/avatar.png',
      })
      .expect(200);

    expect(response.body).toEqual({
      id: 'user-1',
      email: 'owner@example.com',
      displayName: 'Owner Name',
      avatarUrl: 'https://example.com/avatar.png',
    });
    expect(updateMe.execute).toHaveBeenCalledWith('user-1', {
      displayName: 'Owner Name',
      avatarUrl: 'https://example.com/avatar.png',
    });
  });

  it('serves the OAuth failure redirect target', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/failure?error=oauth_failed')
      .expect(200);

    expect(response.body).toEqual({
      error: 'oauth_failed',
    });
  });
});
