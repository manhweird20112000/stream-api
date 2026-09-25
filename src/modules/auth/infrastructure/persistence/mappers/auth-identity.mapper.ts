import { DeepPartial } from 'typeorm';
import { AuthIdentity } from '../../../domain/auth-identity';
import { AuthIdentityEntity } from '../entities/auth-identity.entity';
import { AuthUserMapper } from './auth-user.mapper';

export class AuthIdentityMapper {
  static toDomain(identity: AuthIdentityEntity): AuthIdentity {
    return {
      id: identity.id,
      userId: identity.userId,
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      providerEmail: identity.providerEmail,
      providerEmailVerified: identity.providerEmailVerified,
      metadata: identity.metadata,
      user: identity.user ? AuthUserMapper.toDomain(identity.user) : undefined,
    };
  }

  static toPersistence(identity: AuthIdentity): DeepPartial<AuthIdentityEntity> {
    return {
      id: identity.id,
      userId: identity.userId,
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      providerEmail: identity.providerEmail,
      providerEmailVerified: identity.providerEmailVerified,
      metadata: identity.metadata,
    };
  }
}
