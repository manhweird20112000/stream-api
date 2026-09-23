import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export type FileRequest = Request & { userId?: string };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FileRequest>();
    const [scheme, token, extra] =
      request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token || extra) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub?: unknown }>(token, {
        algorithms: ['HS256'],
      });
      if (typeof payload.sub !== 'string' || !payload.sub) {
        throw new UnauthorizedException();
      }
      request.userId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
