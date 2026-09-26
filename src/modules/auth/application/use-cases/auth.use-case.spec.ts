import { AUTH_TOPICS } from '@/infrastructure/kafka/kafka.constants';
import { AuthUseCase } from './auth.use-case';

describe('AuthUseCase', () => {
  let kafka: { request: jest.Mock };
  let useCase: AuthUseCase;

  beforeEach(() => {
    kafka = { request: jest.fn() };
    useCase = new AuthUseCase(kafka as never);
  });

  it('publishes an auth.register command envelope', async () => {
    kafka.request.mockResolvedValue({ userId: 'user-1' });

    await expect(
      useCase.register({
        email: 'user@example.com',
        password: 'secret123',
        name: 'User',
      }),
    ).resolves.toEqual({ userId: 'user-1' });

    expect(kafka.request).toHaveBeenCalledWith(
      AUTH_TOPICS.commands,
      expect.objectContaining({
        requestId: expect.any(String),
        type: 'auth.register',
        payload: {
          email: 'user@example.com',
          password: 'secret123',
          name: 'User',
        },
      }),
    );
  });

  it('publishes an auth.login command envelope', async () => {
    kafka.request.mockResolvedValue({ accessToken: 'access-token' });

    await expect(
      useCase.login({
        email: 'user@example.com',
        password: 'secret123',
      }),
    ).resolves.toEqual({ accessToken: 'access-token' });

    expect(kafka.request).toHaveBeenCalledWith(
      AUTH_TOPICS.commands,
      expect.objectContaining({
        requestId: expect.any(String),
        type: 'auth.login',
        payload: {
          email: 'user@example.com',
          password: 'secret123',
        },
      }),
    );
  });

  it('publishes user scoped auth commands', async () => {
    kafka.request
      .mockResolvedValueOnce({ accessToken: 'new-access-token' })
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ userId: 'user-1' });

    await useCase.refresh({ refreshToken: 'refresh-token' });
    await useCase.logout({ userId: 'user-1' });
    await useCase.me({ userId: 'user-1' });

    expect(kafka.request).toHaveBeenNthCalledWith(
      1,
      AUTH_TOPICS.commands,
      expect.objectContaining({
        type: 'auth.refresh',
        payload: { refreshToken: 'refresh-token' },
      }),
    );
    expect(kafka.request).toHaveBeenNthCalledWith(
      2,
      AUTH_TOPICS.commands,
      expect.objectContaining({
        userId: 'user-1',
        type: 'auth.logout',
        payload: {},
      }),
    );
    expect(kafka.request).toHaveBeenNthCalledWith(
      3,
      AUTH_TOPICS.commands,
      expect.objectContaining({
        userId: 'user-1',
        type: 'auth.me',
        payload: {},
      }),
    );
  });
});
