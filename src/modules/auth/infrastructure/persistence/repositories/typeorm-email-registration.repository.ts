import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource, IsNull, MoreThan } from 'typeorm';
import {
  EmailRegistrationDraftInput,
  EmailRegistrationDraftResult,
  EmailRegistrationRepository,
  VerifyEmailInput,
} from '../../../domain/auth-email-verification';
import { AuthProvider } from '../../../domain/auth-provider';
import { SavedAuthUser, UserStatus } from '../../../domain/auth-user';
import { AuthEmailVerificationEntity } from '../entities/auth-email-verification.entity';
import { AuthIdentityEntity } from '../entities/auth-identity.entity';
import { OutboxEventEntity } from '../entities/outbox-event.entity';
import { UserEntity } from '../entities/user.entity';
import { AuthUserMapper, EmailRegistrationMapper } from '../mappers';

@Injectable()
export class TypeOrmEmailRegistrationRepository
  implements EmailRegistrationRepository
{
  constructor(private readonly dataSource: DataSource) {}

  async saveDraft(
    input: EmailRegistrationDraftInput,
  ): Promise<EmailRegistrationDraftResult> {
    return this.dataSource.transaction(async (manager) => {
      const users = manager.getRepository(UserEntity);
      const identities = manager.getRepository(AuthIdentityEntity);
      const verifications = manager.getRepository(AuthEmailVerificationEntity);
      const outbox = manager.getRepository(OutboxEventEntity);

      let user = await users.findOne({ where: { email: input.email } });
      if (user?.emailVerified || user?.status === UserStatus.Active) {
        throw new ConflictException('Email is already registered');
      }

      user = await users.save(
        users.create(EmailRegistrationMapper.toPendingUser(input, user)),
      );

      const existingIdentity = await identities.findOne({
        where: { userId: user.id, provider: AuthProvider.Email },
      });
      await identities.save(
        identities.create(
          EmailRegistrationMapper.toEmailIdentity(
            input.email,
            user.id,
            existingIdentity,
          ),
        ),
      );

      await verifications.update(
        {
          email: input.email,
          consumedAt: IsNull(),
          invalidatedAt: IsNull(),
        },
        { invalidatedAt: new Date() },
      );
      await verifications.save(
        verifications.create(
          EmailRegistrationMapper.toVerification(input, user.id),
        ),
      );
      await outbox.save(
        outbox.create(EmailRegistrationMapper.toOutboxEvent(input, user.id)),
      );

      return { user: AuthUserMapper.toDomain(user) };
    });
  }

  async verifyEmail(input: VerifyEmailInput): Promise<SavedAuthUser | null> {
    return this.dataSource.transaction(async (manager) => {
      const users = manager.getRepository(UserEntity);
      const identities = manager.getRepository(AuthIdentityEntity);
      const verifications = manager.getRepository(AuthEmailVerificationEntity);

      const verification = await verifications.findOne({
        where: {
          email: input.email,
          codeHash: input.codeHash,
          consumedAt: IsNull(),
          invalidatedAt: IsNull(),
          expiresAt: MoreThan(new Date()),
        },
        order: { createdAt: 'DESC' },
        relations: { user: true },
      });

      if (!verification?.user) {
        return null;
      }

      verification.consumedAt = new Date();
      await verifications.save(verification);

      const user = await users.save(
        users.create(EmailRegistrationMapper.toVerifiedUser(verification.user)),
      );

      const identity = await identities.findOne({
        where: { userId: user.id, provider: AuthProvider.Email },
      });
      if (identity) {
        identity.providerEmailVerified = true;
        await identities.save(identity);
      }

      return AuthUserMapper.toDomain(user);
    });
  }
}
