import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IAdapterSecret } from '@/infrastructure/secret/adapter';
import { SecretModule } from '@/infrastructure/secret';
import { AuthAccountService } from './application/services/auth-account.service';
import { SessionIssuerService } from './application/services/session-issuer.service';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { LoginWithPasswordUseCase } from './application/use-cases/login-with-password.use-case';
import { LoginWithProviderUseCase } from './application/use-cases/login-with-provider.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.use-case';
import { RegisterWithPasswordUseCase } from './application/use-cases/register-with-password.use-case';
import { UpdateCurrentUserUseCase } from './application/use-cases/update-current-user.use-case';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.use-case';
import { EmailRegistrationRepository } from './domain/auth-email-verification';
import { AccessTokenService } from './domain/ports/access-token.service';
import { AuthIdentityRepository } from './domain/ports/auth-identity.repository';
import { AuthRefreshTokenRepository } from './domain/ports/auth-refresh-token.repository';
import { AuthUserRepository } from './domain/ports/auth-user.repository';
import { EmailSender } from './domain/ports/email-sender';
import { PasswordHasher } from './domain/ports/password-hasher';
import { RefreshTokenService } from './domain/ports/refresh-token.service';
import { VerificationCodeService } from './domain/ports/verification-code.service';
import { JwtAuthGuard } from '@/shared/presentation/guards/jwt-auth.guard';
import { BcryptPasswordHasher } from './infrastructure/crypto/bcrypt-password-hasher';
import { NodeRefreshTokenService } from './infrastructure/crypto/node-refresh-token.service';
import { NumericVerificationCodeService } from './infrastructure/crypto/numeric-verification-code.service';
import { EmailOutboxProcessor } from './infrastructure/email/email-outbox.processor';
import { SmtpEmailSender } from './infrastructure/email/smtp-email.sender';
import { GoogleOAuthClient } from './infrastructure/google-oauth.client';
import { JwtAccessTokenService } from './infrastructure/jwt/jwt-access-token.service';
import {
  AuthEmailVerificationEntity,
  AuthIdentityEntity,
  AuthRefreshTokenEntity,
  OutboxEventEntity,
  UserEntity,
} from './infrastructure/persistence/entities';
import {
  TypeOrmAuthIdentityRepository,
  TypeOrmAuthRefreshTokenRepository,
  TypeOrmAuthUserRepository,
  TypeOrmEmailRegistrationRepository,
} from './infrastructure/persistence/repositories';
import { AuthController } from './presentation/http/auth.controller';
import { AuthKafkaController } from './presentation/kafka/auth.kafka.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      AuthIdentityEntity,
      AuthRefreshTokenEntity,
      AuthEmailVerificationEntity,
      OutboxEventEntity,
    ]),
    JwtModule.registerAsync({
      imports: [SecretModule],
      inject: [IAdapterSecret],
      useFactory: (secrets: IAdapterSecret) => ({
        secret: secrets.JWT_SECRET,
        signOptions: {
          expiresIn: secrets.TOKEN_EXPIRATION as NonNullable<
            JwtModuleOptions['signOptions']
          >['expiresIn'],
        },
      }),
    }),
    SecretModule,
  ],
  controllers: [AuthController, AuthKafkaController],
  providers: [
    AuthAccountService,
    SessionIssuerService,
    GetCurrentUserUseCase,
    RegisterWithPasswordUseCase,
    VerifyEmailUseCase,
    LoginWithPasswordUseCase,
    LoginWithProviderUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    UpdateCurrentUserUseCase,
    EmailOutboxProcessor,
    GoogleOAuthClient,
    JwtAuthGuard,
    { provide: AuthUserRepository, useClass: TypeOrmAuthUserRepository },
    {
      provide: AuthIdentityRepository,
      useClass: TypeOrmAuthIdentityRepository,
    },
    {
      provide: AuthRefreshTokenRepository,
      useClass: TypeOrmAuthRefreshTokenRepository,
    },
    { provide: PasswordHasher, useClass: BcryptPasswordHasher },
    { provide: EmailSender, useClass: SmtpEmailSender },
    { provide: AccessTokenService, useClass: JwtAccessTokenService },
    { provide: RefreshTokenService, useClass: NodeRefreshTokenService },
    {
      provide: VerificationCodeService,
      useClass: NumericVerificationCodeService,
    },
    {
      provide: EmailRegistrationRepository,
      useClass: TypeOrmEmailRegistrationRepository,
    },
  ],
  exports: [
    RegisterWithPasswordUseCase,
    VerifyEmailUseCase,
    GetCurrentUserUseCase,
    UpdateCurrentUserUseCase,
    LoginWithPasswordUseCase,
    LoginWithProviderUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
  ],
})
export class AuthModule {}
