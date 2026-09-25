import { DeepPartial } from 'typeorm';
import { EmailRegistrationDraftInput } from '../../../domain/auth-email-verification';
import { AuthProvider } from '../../../domain/auth-provider';
import { UserStatus } from '../../../domain/auth-user';
import { AuthEmailVerificationEntity } from '../entities/auth-email-verification.entity';
import { AuthIdentityEntity } from '../entities/auth-identity.entity';
import {
  OutboxEventEntity,
  OutboxEventStatus,
} from '../entities/outbox-event.entity';
import { UserEntity } from '../entities/user.entity';

export class EmailRegistrationMapper {
  static toPendingUser(
    input: EmailRegistrationDraftInput,
    existing: UserEntity | null,
  ): DeepPartial<UserEntity> {
    return {
      id: existing?.id,
      email: input.email,
      emailVerified: false,
      displayName: null,
      avatarUrl: existing?.avatarUrl ?? null,
      passwordHash: input.passwordHash,
      status: UserStatus.PendingVerification,
    };
  }

  static toEmailIdentity(
    email: string,
    userId: string,
    existing: AuthIdentityEntity | null,
  ): DeepPartial<AuthIdentityEntity> {
    return {
      id: existing?.id,
      userId,
      provider: AuthProvider.Email,
      providerUserId: email,
      providerEmail: email,
      providerEmailVerified: false,
      metadata: null,
    };
  }

  static toVerification(
    input: EmailRegistrationDraftInput,
    userId: string,
  ): DeepPartial<AuthEmailVerificationEntity> {
    return {
      userId,
      email: input.email,
      codeHash: input.codeHash,
      expiresAt: input.expiresAt,
      consumedAt: null,
      invalidatedAt: null,
    };
  }

  static toOutboxEvent(
    input: EmailRegistrationDraftInput,
    userId: string,
  ): DeepPartial<OutboxEventEntity> {
    return {
      aggregateType: 'user',
      aggregateId: userId,
      type: 'auth.email_verification_requested',
      payload: {
        email: input.email,
        code: input.rawCode,
        expiresAt: input.expiresAt.toISOString(),
      },
      status: OutboxEventStatus.Pending,
      processedAt: null,
    };
  }

  static toVerifiedUser(user: UserEntity): DeepPartial<UserEntity> {
    return {
      ...user,
      emailVerified: true,
      status: UserStatus.Active,
    };
  }
}
