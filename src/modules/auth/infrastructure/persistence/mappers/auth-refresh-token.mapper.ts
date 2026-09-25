import { DeepPartial } from 'typeorm';
import {
  AuthRefreshToken,
  SavedAuthRefreshToken,
} from '../../../domain/auth-refresh-token';
import { AuthRefreshTokenEntity } from '../entities/auth-refresh-token.entity';
import { AuthUserMapper } from './auth-user.mapper';

export class AuthRefreshTokenMapper {
  static toDomain(token: AuthRefreshTokenEntity): SavedAuthRefreshToken {
    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      revokedAt: token.revokedAt,
      replacedByTokenId: token.replacedByTokenId,
      userAgent: token.userAgent,
      ipAddress: token.ipAddress,
      user: token.user ? AuthUserMapper.toDomain(token.user) : undefined,
    };
  }

  static toPersistence(
    token: AuthRefreshToken,
  ): DeepPartial<AuthRefreshTokenEntity> {
    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      revokedAt: token.revokedAt,
      replacedByTokenId: token.replacedByTokenId,
      userAgent: token.userAgent,
      ipAddress: token.ipAddress,
    };
  }
}
