import { Injectable } from '@nestjs/common';
import { InvalidCredentialsException } from '@/shared/exceptions';
import { AuthResult } from '../dto/auth-result';
import { AuthRefreshTokenRepository } from '../../domain/ports/auth-refresh-token.repository';
import { SessionIssuerService } from '../services/session-issuer.service';

export interface RefreshSessionInput {
  refreshToken: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}

@Injectable()
export class RefreshSessionUseCase {
  constructor(
    private readonly refreshTokens: AuthRefreshTokenRepository,
    private readonly sessions: SessionIssuerService,
  ) {}

  async execute(input: RefreshSessionInput): Promise<AuthResult> {
    const existing = await this.refreshTokens.findByHash(
      this.sessions.hashRefreshToken(input.refreshToken),
    );

    if (
      !existing?.user ||
      existing.revokedAt ||
      existing.expiresAt.getTime() <= Date.now()
    ) {
      throw new InvalidCredentialsException();
    }

    const next = await this.sessions.createRefreshToken(existing.user, {
      userAgent: input.userAgent ?? existing.userAgent,
      ipAddress: input.ipAddress ?? existing.ipAddress,
    });

    await this.refreshTokens.save({
      ...existing,
      revokedAt: new Date(),
      replacedByTokenId: next.entity.id,
    });

    return this.sessions.issue(existing.user, next.value);
  }
}

