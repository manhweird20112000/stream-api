import { AuthProvider } from './auth-provider';

export interface ProviderProfile {
  provider: AuthProvider;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  displayName?: string | null;
  avatarUrl?: string | null;
  metadata?: Record<string, unknown>;
}

