import { AUTH_TOPICS } from '@/infrastructure/kafka/kafka.constants';
import { AuthUseCase } from './auth.use-case';

describe('AuthUseCase', () => {
  let kafka: { request: jest.Mock };
  let useCase: AuthUseCase;

  beforeEach(() => {
    kafka = { request: jest.fn() };
    useCase = new AuthUseCase(kafka as never);
  });

  it('sends register payload to the auth.register topic', async () => {
    kafka.request.mockResolvedValue({ userId: 'user-1' });

    const input = {
      email: 'user@example.com',
      password: 'secret123',
      name: 'User',
    };

    await expect(useCase.register(input)).resolves.toEqual({
      userId: 'user-1',
    });

    expect(kafka.request).toHaveBeenCalledWith(AUTH_TOPICS.register, input);
  });

  it('sends login payload to the auth.login topic', async () => {
    kafka.request.mockResolvedValue({ accessToken: 'access-token' });

    const input = {
      email: 'user@example.com',
      password: 'secret123',
    };

    await expect(useCase.login(input)).resolves.toEqual({
      accessToken: 'access-token',
    });

    expect(kafka.request).toHaveBeenCalledWith(AUTH_TOPICS.login, input);
  });

  it('sends refresh, logout, and me payloads to auth topics', async () => {
    kafka.request
      .mockResolvedValueOnce({ accessToken: 'new-access-token' })
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ userId: 'user-1' });

    await useCase.refresh({ refreshToken: 'refresh-token' });
    await useCase.logout({ refreshToken: 'refresh-token' });
    await useCase.me({ userId: 'user-1' });

    expect(kafka.request).toHaveBeenNthCalledWith(
      1,
      AUTH_TOPICS.refresh,
      { refreshToken: 'refresh-token' },
    );
    expect(kafka.request).toHaveBeenNthCalledWith(
      2,
      AUTH_TOPICS.logout,
      { refreshToken: 'refresh-token' },
    );
    expect(kafka.request).toHaveBeenNthCalledWith(
      3,
      AUTH_TOPICS.me,
      { userId: 'user-1' },
    );
  });
});
