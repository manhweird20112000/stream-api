import { Injectable } from '@nestjs/common';
import { AuthResult } from '../dto/auth-result';
import { AuthRefreshTokenRepository } from '../../domain/ports/auth-refresh-token.repository';
import { AccessTokenService } from '../../domain/ports/access-token.service';
import { RefreshTokenService } from '../../domain/ports/refresh-token.service';
import { SavedAuthUser } from '../../domain/auth-user';
import { SavedAuthRefreshToken } from '../../domain/auth-refresh-token';

@Injectable()
export class SessionIssuerService {
  constructor(
    private readonly accessTokens: AccessTokenService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly refreshTokenRepository: AuthRefreshTokenRepository,
  ) {}

  async issue(
    user: SavedAuthUser,
    refreshToken?: string,
  ): Promise<AuthResult> {
    const accessToken = await this.accessTokens.sign(user);
    const token =
      refreshToken ?? (await this.createRefreshToken(user)).value;

    return {
      accessToken,
      refreshToken: token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async createRefreshToken(
    user: SavedAuthUser,
    context: { userAgent?: string | null; ipAddress?: string | null } = {},
  ): Promise<{ value: string; entity: SavedAuthRefreshToken }> {
    const value = this.refreshTokens.generate();
    const entity = await this.refreshTokenRepository.save({
      userId: user.id,
      user,
      tokenHash: this.refreshTokens.hash(value),
      expiresAt: this.refreshTokens.expiresAt(),
      revokedAt: null,
      replacedByTokenId: null,
      userAgent: context.userAgent ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return { value, entity };
  }

  hashRefreshToken(refreshToken: string): string {
    return this.refreshTokens.hash(refreshToken);
  }
}

