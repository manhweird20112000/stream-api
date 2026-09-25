import { Injectable } from '@nestjs/common';
import { AuthRefreshTokenRepository } from '../../domain/ports/auth-refresh-token.repository';
import { SessionIssuerService } from '../services/session-issuer.service';

export interface LogoutInput {
  refreshToken: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly refreshTokens: AuthRefreshTokenRepository,
    private readonly sessions: SessionIssuerService,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    const existing = await this.refreshTokens.findByHash(
      this.sessions.hashRefreshToken(input.refreshToken),
    );

    if (!existing || existing.revokedAt) {
      return;
    }

    await this.refreshTokens.save({
      ...existing,
      revokedAt: new Date(),
    });
  }
}

