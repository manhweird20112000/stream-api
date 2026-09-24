import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

function contextWithAuthHeader(value?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: value ? { authorization: value } : {},
      }),
    }),
  } as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('rejects requests without a bearer token', async () => {
    const guard = new JwtAuthGuard(new JwtService({ secret: 'secret' }));

    await expect(guard.canActivate(contextWithAuthHeader())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('attaches the verified JWT payload to the request', async () => {
    const jwt = new JwtService({ secret: 'secret' });
    const token = await jwt.signAsync({ sub: 'user-1' });
    const request = { headers: { authorization: `Bearer ${token}` } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
    const guard = new JwtAuthGuard(jwt);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({ sub: 'user-1' }),
      }),
    );
  });
});
