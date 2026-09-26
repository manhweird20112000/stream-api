import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let useCase: {
    register: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    me: jest.Mock;
  };
  let controller: AuthController;

  beforeEach(() => {
    useCase = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      me: jest.fn(),
    };
    controller = new AuthController(useCase as never);
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

  it('passes login requests to the auth use case', async () => {
    useCase.login.mockResolvedValue({ accessToken: 'access-token' });

    await expect(
      controller.login({
        email: 'user@example.com',
        password: 'secret123',
      }),
    ).resolves.toEqual({ accessToken: 'access-token' });

    expect(useCase.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret123',
    });
  });

  it('passes the authenticated user to me and logout requests', async () => {
    useCase.me.mockResolvedValue({ userId: 'user-1' });
    useCase.logout.mockResolvedValue({ success: true });

    await expect(
      controller.me({ user: { sub: 'user-1' } } as never),
    ).resolves.toEqual({ userId: 'user-1' });
    await expect(
      controller.logout({ user: { sub: 'user-1' } } as never),
    ).resolves.toEqual({ success: true });

    expect(useCase.me).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(useCase.logout).toHaveBeenCalledWith({ userId: 'user-1' });
  });
});
