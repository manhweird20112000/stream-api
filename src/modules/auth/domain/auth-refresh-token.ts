import { SavedAuthUser } from './auth-user';

export interface AuthRefreshToken {
  id?: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByTokenId: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  user?: SavedAuthUser;
}

export interface SavedAuthRefreshToken extends AuthRefreshToken {
  id: string;
}

