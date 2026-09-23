import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: 'test-secret' });
  const guard = new JwtAuthGuard(jwt);

  function context(authorization?: string) {
    const request = {
      headers: { authorization },
      userId: undefined as string | undefined,
    };
    return {
      request,
      executionContext: {
        switchToHttp: () => ({ getRequest: () => request }),
      } as ExecutionContext,
    };
  }

  it('accepts a signed token and exposes its subject', async () => {
    const token = await jwt.signAsync({ sub: 'user-a' });
    const { request, executionContext } = context(`Bearer ${token}`);

    await expect(guard.canActivate(executionContext)).resolves.toBe(true);
    expect(request.userId).toBe('user-a');
  });

  it('rejects missing, invalid, and subject-less tokens', async () => {
    const subjectless = await jwt.signAsync({ role: 'user' });
    for (const authorization of [
      undefined,
      'Bearer invalid',
      `Bearer ${subjectless}`,
    ]) {
      await expect(
        guard.canActivate(context(authorization).executionContext),
      ).rejects.toThrow(UnauthorizedException);
    }
  });
});
