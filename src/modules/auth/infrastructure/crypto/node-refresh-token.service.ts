import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { IAdapterSecret } from '@/infrastructure/secret/adapter';
import { RefreshTokenService } from '../../domain/ports/refresh-token.service';

@Injectable()
export class NodeRefreshTokenService implements RefreshTokenService {
  constructor(private readonly secrets: IAdapterSecret) {}

  generate(): string {
    return randomBytes(32).toString('base64url');
  }

  hash(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  expiresAt(): Date {
    return new Date(
      Date.now() +
        this.secrets.REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
    );
  }
}

