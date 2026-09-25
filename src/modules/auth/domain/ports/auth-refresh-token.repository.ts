import {
  AuthRefreshToken,
  SavedAuthRefreshToken,
} from '../auth-refresh-token';

export abstract class AuthRefreshTokenRepository {
  abstract findByHash(tokenHash: string): Promise<SavedAuthRefreshToken | null>;
  abstract save(
    token: AuthRefreshToken,
  ): Promise<SavedAuthRefreshToken>;
}

