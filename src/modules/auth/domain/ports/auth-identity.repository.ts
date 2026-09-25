import { AuthIdentity } from '../auth-identity';
import { AuthProvider } from '../auth-provider';

export abstract class AuthIdentityRepository {
  abstract findByProvider(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<AuthIdentity | null>;

  abstract findByUserAndProvider(
    userId: string,
    provider: AuthProvider,
  ): Promise<AuthIdentity | null>;

  abstract save(identity: AuthIdentity): Promise<AuthIdentity>;
}

