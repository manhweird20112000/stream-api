import { AuthKafkaController } from './auth.kafka.controller';
import { InvalidCredentialsException } from '@/shared/exceptions';

describe('AuthKafkaController', () => {
  function createController(overrides: {
    register?: unknown;
    login?: unknown;
    provider?: unknown;
    refresh?: unknown;
    logout?: unknown;
    me?: unknown;
    updateMe?: unknown;
    verify?: unknown;
    google?: unknown;
  }) {
    return new AuthKafkaController(
      (overrides.register ?? {}) as never,
      (overrides.login ?? {}) as never,
      (overrides.provider ?? {}) as never,
      (overrides.refresh ?? {}) as never,
      (overrides.logout ?? {}) as never,
      (overrides.me ?? {}) as never,
      (overrides.updateMe ?? {}) as never,
      (overrides.verify ?? {}) as never,
      (overrides.google ?? {}) as never,
    );
  }

  it('handles registration commands through the register use case', async () => {
    const register = {
      execute: jest.fn().mockResolvedValue({
        email: 'owner@example.com',
        verificationRequired: true,
      }),
    };
    const controller = createController({ register });

    await expect(
      controller.register({
        email: 'owner@example.com',
        password: 'secret123',
      }),
    ).resolves.toEqual({
      email: 'owner@example.com',
      verificationRequired: true,
    });
    expect(register.execute).toHaveBeenCalledWith({
      email: 'owner@example.com',
      password: 'secret123',
    });
  });

  it('returns a full auth result for password login commands', async () => {
    const authResult = {
      accessToken: 'access-token-1',
      refreshToken: 'refresh-token-1',
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        displayName: null,
        avatarUrl: null,
      },
    };
    const login = { execute: jest.fn().mockResolvedValue(authResult) };
    const controller = createController({ login });

    await expect(
      controller.login({
        email: 'owner@example.com',
        password: 'secret123',
      }),
    ).resolves.toEqual(authResult);
  });

  it('refreshes sessions with gateway-provided request metadata', async () => {
    const authResult = {
      accessToken: 'access-token-2',
      refreshToken: 'refresh-token-2',
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        displayName: null,
        avatarUrl: null,
      },
    };
    const refresh = { execute: jest.fn().mockResolvedValue(authResult) };
    const controller = createController({ refresh });

    await expect(
      controller.refresh({
        refreshToken: 'refresh-token-1',
        userAgent: 'Mozilla/5.0',
        ipAddress: '127.0.0.1',
      }),
    ).resolves.toEqual(authResult);
    expect(refresh.execute).toHaveBeenCalledWith({
      refreshToken: 'refresh-token-1',
      userAgent: 'Mozilla/5.0',
      ipAddress: '127.0.0.1',
    });
  });

  it('logs out by revoking the gateway-provided refresh token', async () => {
    const logout = { execute: jest.fn().mockResolvedValue(undefined) };
    const controller = createController({ logout });

    await expect(
      controller.logout({ refreshToken: 'refresh-token-1' }),
    ).resolves.toEqual({ revoked: true });
    expect(logout.execute).toHaveBeenCalledWith({
      refreshToken: 'refresh-token-1',
    });
  });

  it('loads and updates users by gateway-authenticated user id', async () => {
    const me = {
      execute: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'owner@example.com',
        displayName: null,
        avatarUrl: null,
      }),
    };
    const updateMe = {
      execute: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'owner@example.com',
        displayName: 'Owner Name',
        avatarUrl: 'https://example.com/avatar.png',
      }),
    };
    const controller = createController({ me, updateMe });

    await expect(controller.me({ userId: 'user-1' })).resolves.toEqual({
      id: 'user-1',
      email: 'owner@example.com',
      displayName: null,
      avatarUrl: null,
    });
    await expect(
      controller.updateMe({
        userId: 'user-1',
        displayName: 'Owner Name',
        avatarUrl: 'https://example.com/avatar.png',
      }),
    ).resolves.toEqual({
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

  it('creates Google authorization URLs and exchanges callback codes', async () => {
    const profile = {
      provider: 'google',
      providerUserId: 'google-sub-1',
      email: 'owner@example.com',
      emailVerified: true,
    };
    const authResult = {
      accessToken: 'access-token-1',
      refreshToken: 'refresh-token-1',
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        displayName: null,
        avatarUrl: null,
      },
    };
    const google = {
      createAuthorizationUrl: jest.fn(() => ({
        url: 'https://accounts.google.com/o/oauth2/v2/auth?state=state-1',
        state: 'state-1',
      })),
      exchangeCode: jest.fn().mockResolvedValue(profile),
    };
    const provider = { execute: jest.fn().mockResolvedValue(authResult) };
    const controller = createController({ google, provider });

    await expect(controller.googleStart()).resolves.toEqual({
      url: 'https://accounts.google.com/o/oauth2/v2/auth?state=state-1',
      state: 'state-1',
    });
    await expect(
      controller.googleCallback({ code: 'code-1' }),
    ).resolves.toEqual(authResult);
    expect(provider.execute).toHaveBeenCalledWith(profile);
  });

  it('returns auth errors as Kafka error replies', async () => {
    const login = {
      execute: jest.fn().mockRejectedValue(new InvalidCredentialsException()),
    };
    const controller = createController({ login });

    await expect(
      controller.login({
        email: 'owner@example.com',
        password: 'wrong-password',
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'InvalidCredentialsException',
        message: 'Invalid credentials',
        statusCode: 401,
      },
    });
  });
});
