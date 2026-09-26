import { AuthController } from './auth.controller';
import { InvalidCredentialsException } from '@/shared/exceptions';

describe('AuthController', () => {
  const secrets = {
    AUTH_SUCCESS_REDIRECT_URL: 'http://localhost:3000/api/v1/auth/success',
    AUTH_FAILURE_REDIRECT_URL: 'http://localhost:3000/api/v1/auth/failure',
    REFRESH_TOKEN_EXPIRATION_DAYS: 30,
  };

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
    return new AuthController(
      (overrides.register ?? {}) as never,
      (overrides.login ?? {}) as never,
      (overrides.provider ?? {}) as never,
      (overrides.refresh ?? {}) as never,
      (overrides.logout ?? {}) as never,
      (overrides.me ?? {}) as never,
      (overrides.updateMe ?? {}) as never,
      (overrides.verify ?? {}) as never,
      (overrides.google ?? {}) as never,
      secrets as never,
    );
  }

  it('registers an email/password draft without setting session cookies', async () => {
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

  it('verifies email and sets refresh token cookie', async () => {
    const verify = {
      execute: jest.fn().mockResolvedValue({
        accessToken: 'access-token-1',
        refreshToken: 'refresh-token-1',
        user: {
          id: 'user-1',
          email: 'owner@example.com',
          displayName: null,
          avatarUrl: null,
        },
      }),
    };
    const response = {
      cookie: jest.fn(),
    };
    const controller = createController({ verify });

    await expect(
      controller.verifyEmailCode(
        { email: 'owner@example.com', code: '123456' },
        response as never,
      ),
    ).resolves.toEqual({
      accessToken: 'access-token-1',
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        displayName: null,
        avatarUrl: null,
      },
    });
    expect(response.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token-1',
      expect.objectContaining({ httpOnly: true, path: '/api/v1/auth' }),
    );
  });

  it('redirects Google start and stores the OAuth state cookie', () => {
    const google = {
      createAuthorizationUrl: jest.fn(() => ({
        url: 'https://accounts.google.com/o/oauth2/v2/auth?state=state-1',
        state: 'state-1',
      })),
    };
    const response = {
      cookie: jest.fn(),
      redirect: jest.fn(),
    };
    const controller = createController({ google });

    controller.startGoogle(response as never);

    expect(response.cookie).toHaveBeenCalledWith(
      'oauth_state',
      'state-1',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/api/v1/auth/google/callback',
      }),
    );
    expect(response.redirect).toHaveBeenCalledWith(
      'https://accounts.google.com/o/oauth2/v2/auth?state=state-1',
    );
  });

  it('exchanges a valid Google callback and redirects with an access token fragment', async () => {
    const profile = {
      provider: 'google',
      providerUserId: 'google-sub-1',
      email: 'owner@example.com',
      emailVerified: true,
    };
    const google = {
      exchangeCode: jest.fn().mockResolvedValue(profile),
    };
    const provider = {
      execute: jest.fn().mockResolvedValue({
        accessToken: 'access-token-1',
        refreshToken: 'refresh-token-1',
        user: {
          id: 'user-1',
          email: 'owner@example.com',
          displayName: null,
          avatarUrl: null,
        },
      }),
    };
    const response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      redirect: jest.fn(),
    };
    const controller = createController({ provider, google });

    await controller.googleCallback(
      'code-1',
      'state-1',
      'oauth_state=state-1',
      response as never,
    );

    expect(google.exchangeCode).toHaveBeenCalledWith('code-1');
    expect(provider.execute).toHaveBeenCalledWith(profile);
    expect(response.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token-1',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/api/v1/auth',
      }),
    );
    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/auth/success#access_token=access-token-1',
    );
  });

  it('redirects to failure when OAuth state does not match', async () => {
    const google = { exchangeCode: jest.fn() };
    const provider = { execute: jest.fn() };
    const response = {
      clearCookie: jest.fn(),
      redirect: jest.fn(),
    };
    const controller = createController({ provider, google });

    await controller.googleCallback(
      'code-1',
      'state-1',
      'oauth_state=other-state',
      response as never,
    );

    expect(google.exchangeCode).not.toHaveBeenCalled();
    expect(provider.execute).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/auth/failure?error=oauth_state_invalid',
    );
  });

  it('returns the OAuth failure error for redirected browsers', () => {
    const controller = createController({});

    expect(controller.authFailure('oauth_failed')).toEqual({
      error: 'oauth_failed',
    });
  });

  it('sets refresh token cookie for password login without returning it in the body', async () => {
    const login = {
      execute: jest.fn().mockResolvedValue({
        accessToken: 'access-token-1',
        refreshToken: 'refresh-token-1',
        user: {
          id: 'user-1',
          email: 'owner@example.com',
          displayName: null,
          avatarUrl: null,
        },
      }),
    };
    const response = {
      cookie: jest.fn(),
    };
    const controller = createController({ login });

    await expect(
      controller.login(
        { email: 'owner@example.com', password: 'secret123' },
        response as never,
      ),
    ).resolves.toEqual({
      accessToken: 'access-token-1',
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        displayName: null,
        avatarUrl: null,
      },
    });
    expect(response.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token-1',
      expect.objectContaining({ httpOnly: true, path: '/api/v1/auth' }),
    );
  });

  it('refreshes using cookie token and rotates the refresh cookie', async () => {
    const refresh = {
      execute: jest.fn().mockResolvedValue({
        accessToken: 'access-token-2',
        refreshToken: 'refresh-token-2',
        user: {
          id: 'user-1',
          email: 'owner@example.com',
          displayName: null,
          avatarUrl: null,
        },
      }),
    };
    const response = {
      cookie: jest.fn(),
    };
    const controller = createController({ refresh });

    await expect(
      controller.refresh(
        {},
        'refresh_token=refresh-token-1',
        'Mozilla/5.0',
        '127.0.0.1',
        response as never,
      ),
    ).resolves.toEqual({
      accessToken: 'access-token-2',
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        displayName: null,
        avatarUrl: null,
      },
    });
    expect(refresh.execute).toHaveBeenCalledWith({
      refreshToken: 'refresh-token-1',
      userAgent: 'Mozilla/5.0',
      ipAddress: '127.0.0.1',
    });
    expect(response.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token-2',
      expect.objectContaining({ httpOnly: true, path: '/api/v1/auth' }),
    );
  });

  it('logs out by revoking the refresh token from the cookie and clearing it', async () => {
    const logout = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const response = {
      clearCookie: jest.fn(),
    };
    const controller = createController({ logout });

    await expect(
      controller.logout(
        'refresh_token=cookie-refresh-token',
        response as never,
      ),
    ).resolves.toEqual({ revoked: true });

    expect(logout.execute).toHaveBeenCalledWith({
      refreshToken: 'cookie-refresh-token',
    });
    expect(response.clearCookie).toHaveBeenCalledWith('refresh_token', {
      path: '/api/v1/auth',
    });
  });

  it('does not accept a body refresh token for logout', async () => {
    const logout = {
      execute: jest.fn(),
    };
    const response = {
      clearCookie: jest.fn(),
    };
    const controller = createController({ logout });

    await expect(
      controller.logout(undefined, response as never),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);

    expect(logout.execute).not.toHaveBeenCalled();
    expect(response.clearCookie).not.toHaveBeenCalled();
  });

  it('loads the current user from the authenticated JWT subject', async () => {
    const me = {
      execute: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'owner@example.com',
        displayName: 'Owner',
        avatarUrl: null,
      }),
    };
    const controller = createController({ me });

    await expect(
      controller.me({
        user: { sub: 'user-1' },
      } as never),
    ).resolves.toEqual({
      id: 'user-1',
      email: 'owner@example.com',
      displayName: 'Owner',
      avatarUrl: null,
    });
    expect(me.execute).toHaveBeenCalledWith('user-1');
  });

  it('updates the current user profile from the authenticated JWT subject', async () => {
    const updateMe = {
      execute: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'owner@example.com',
        displayName: 'Owner Name',
        avatarUrl: 'https://example.com/avatar.png',
      }),
    };
    const controller = createController({ updateMe });

    await expect(
      controller.updateMe(
        {
          user: { sub: 'user-1' },
        } as never,
        {
          displayName: 'Owner Name',
          avatarUrl: 'https://example.com/avatar.png',
        },
      ),
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
});
