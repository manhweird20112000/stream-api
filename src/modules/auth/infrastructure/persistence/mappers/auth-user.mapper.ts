import { DeepPartial } from 'typeorm';
import { AuthUser, SavedAuthUser } from '../../../domain/auth-user';
import { UserEntity } from '../entities/user.entity';

export class AuthUserMapper {
  static toDomain(user: UserEntity): SavedAuthUser {
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      passwordHash: user.passwordHash,
      status: user.status,
    };
  }

  static toPersistence(user: AuthUser): DeepPartial<UserEntity> {
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      passwordHash: user.passwordHash,
      status: user.status,
    };
  }
}
