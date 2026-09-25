import { AuthProvider } from './auth-provider';
import { SavedAuthUser } from './auth-user';

export interface AuthIdentity {
  id?: string;
  userId: string;
  provider: AuthProvider;
  providerUserId: string;
  providerEmail: string | null;
  providerEmailVerified: boolean;
  metadata: Record<string, unknown> | null;
  user?: SavedAuthUser;
}

