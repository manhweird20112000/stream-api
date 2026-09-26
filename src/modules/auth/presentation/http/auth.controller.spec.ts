import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let useCase: {
    register: jest.Mock;
    verifyEmail: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    me: jest.Mock;
    updateMe: jest.Mock;
    googleStart: jest.Mock;
    googleCallback: jest.Mock;
  };
  let response: {
    cookie: jest.Mock;
    clearCookie: jest.Mock;
    redirect: jest.Mock;
  };
  let controller: AuthController;

  beforeEach(() => {
    useCase = {
      register: jest.fn(),
      verifyEmail: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      me: jest.fn(),
      updateMe: jest.fn(),
      googleStart: jest.fn(),
      googleCallback: jest.fn(),
    };
    response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      redirect: jest.fn(),
    };
    controller = new AuthController(useCase as never, {
      REFRESH_TOKEN_EXPIRATION_DAYS: 30,
      AUTH_SUCCESS_REDIRECT_URL: 'http://localhost:3000/api/v1/auth/success',
      AUTH_FAILURE_REDIRECT_URL: 'http://localhost:3000/api/v1/auth/failure',
    } as never);
  });

  it('passes register requests to the auth use case', async () => {
    useCase.register.mockResolvedValue({ userId: 'user-1' });

    await expect(
      controller.register({
        email: 'user@example.com',
        password: 'secret123',
        name: 'User',
      }),
    ).resolves.toEqual({ userId: 'user-1' });

    expect(useCase.register).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret123',
      name: 'User',
    });
  });

  it('sets a refresh cookie for login responses', async () => {
    useCase.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1' },
    });

    await expect(
      controller.login(
        {
          email: 'user@example.com',
          password: 'secret123',
        },
        response as never,
      ),
    ).resolves.toEqual({
      accessToken: 'access-token',
      user: { id: 'user-1' },
    });

    expect(response.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token',
      expect.objectContaining({ httpOnly: true, path: '/api/v1/auth' }),
    );
  });

  it('passes verify-email requests through Kafka and sets refresh cookie', async () => {
    useCase.verifyEmail.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1' },
    });

    await controller.verifyEmailCode(
      { email: 'user@example.com', code: '123456' },
      response as never,
    );

    expect(useCase.verifyEmail).toHaveBeenCalledWith({
      email: 'user@example.com',
      code: '123456',
    });
    expect(response.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token',
      expect.any(Object),
    );
  });

  it('refreshes from cookie when body has no refresh token', async () => {
    useCase.refresh.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      user: { id: 'user-1' },
    });

    await controller.refresh(
      {},
      'refresh_token=old-refresh-token',
      'Mozilla/5.0',
      '127.0.0.1',
      response as never,
    );

    expect(useCase.refresh).toHaveBeenCalledWith({
      refreshToken: 'old-refresh-token',
      userAgent: 'Mozilla/5.0',
      ipAddress: '127.0.0.1',
    });
  });

  it('clears refresh cookie on logout', async () => {
    useCase.logout.mockResolvedValue({ revoked: true });

    await expect(
      controller.logout('refresh_token=old-refresh-token', response as never),
    ).resolves.toEqual({ revoked: true });

    expect(useCase.logout).toHaveBeenCalledWith({
      refreshToken: 'old-refresh-token',
    });
    expect(response.clearCookie).toHaveBeenCalledWith('refresh_token', {
      path: '/api/v1/auth',
    });
  });

  it('passes authenticated me and updateMe requests to auth use case', async () => {
    useCase.me.mockResolvedValue({ userId: 'user-1' });
    useCase.updateMe.mockResolvedValue({ userId: 'user-1' });

    await controller.me({ user: { sub: 'user-1' } } as never);
    await controller.updateMe({ user: { sub: 'user-1' } } as never, {
      displayName: 'User',
    });

    expect(useCase.me).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(useCase.updateMe).toHaveBeenCalledWith({
      userId: 'user-1',
      displayName: 'User',
    });
  });

  it('starts Google OAuth by setting state cookie and redirecting', async () => {
    useCase.googleStart.mockResolvedValue({
      url: 'https://accounts.google.com/o/oauth2/v2/auth?state=state-1',
      state: 'state-1',
    });

    await controller.startGoogle(response as never);

    expect(response.cookie).toHaveBeenCalledWith(
      'oauth_state',
      'state-1',
      expect.objectContaining({ path: '/api/v1/auth/google/callback' }),
    );
    expect(response.redirect).toHaveBeenCalledWith(
      'https://accounts.google.com/o/oauth2/v2/auth?state=state-1',
    );
  });

  it('handles Google callback success', async () => {
    useCase.googleCallback.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1' },
    });

    await controller.googleCallback(
      'code-1',
      'state-1',
      'oauth_state=state-1',
      response as never,
    );

    expect(useCase.googleCallback).toHaveBeenCalledWith({ code: 'code-1' });
    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/auth/success#access_token=access-token',
    );
  });
});
