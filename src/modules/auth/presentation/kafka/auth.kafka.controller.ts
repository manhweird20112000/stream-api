import { Controller, HttpException, HttpStatus } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user.use-case';
import { LoginWithPasswordUseCase } from '../../application/use-cases/login-with-password.use-case';
import { LoginWithProviderUseCase } from '../../application/use-cases/login-with-provider.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { RefreshSessionUseCase } from '../../application/use-cases/refresh-session.use-case';
import { RegisterWithPasswordUseCase } from '../../application/use-cases/register-with-password.use-case';
import { UpdateCurrentUserUseCase } from '../../application/use-cases/update-current-user.use-case';
import { VerifyEmailUseCase } from '../../application/use-cases/verify-email.use-case';
import { GoogleOAuthClient } from '../../infrastructure/google-oauth.client';
import { LoginRequest } from '../http/dto/login.request';
import { RegisterRequest } from '../http/dto/register.request';
import { UpdateMeRequest } from '../http/dto/update-me.request';
import { VerifyEmailRequest } from '../http/dto/verify-email.request';

interface RefreshCommand {
  refreshToken: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}

interface RefreshTokenCommand {
  refreshToken: string;
}

interface UserCommand {
  userId: string;
}

interface UpdateMeCommand extends UpdateMeRequest {
  userId: string;
}

interface GoogleCallbackCommand {
  code: string;
}

interface KafkaErrorReply {
  ok: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
  };
}

@Controller()
export class AuthKafkaController {
  constructor(
    private readonly registerWithPassword: RegisterWithPasswordUseCase,
    private readonly loginWithPassword: LoginWithPasswordUseCase,
    private readonly loginWithProvider: LoginWithProviderUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly logoutSession: LogoutUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly updateCurrentUser: UpdateCurrentUserUseCase,
    private readonly verifyEmail: VerifyEmailUseCase,
    private readonly google: GoogleOAuthClient,
  ) {}

  @MessagePattern('auth.register')
  register(@Payload() body: RegisterRequest) {
    return this.toKafkaReply(() => this.registerWithPassword.execute(body));
  }

  @MessagePattern('auth.verify_email')
  verifyEmailCode(@Payload() body: VerifyEmailRequest) {
    return this.toKafkaReply(() => this.verifyEmail.execute(body));
  }

  @MessagePattern('auth.login')
  login(@Payload() body: LoginRequest) {
    return this.toKafkaReply(() => this.loginWithPassword.execute(body));
  }

  @MessagePattern('auth.refresh')
  refresh(@Payload() body: RefreshCommand) {
    return this.toKafkaReply(() =>
      this.refreshSession.execute({
        refreshToken: body.refreshToken,
        userAgent: body.userAgent ?? null,
        ipAddress: body.ipAddress ?? null,
      }),
    );
  }

  @MessagePattern('auth.logout')
  async logout(
    @Payload() body: RefreshTokenCommand,
  ): Promise<{ revoked: true } | KafkaErrorReply> {
    return this.toKafkaReply(async () => {
      await this.logoutSession.execute({ refreshToken: body.refreshToken });
      return { revoked: true };
    });
  }

  @MessagePattern('auth.me')
  me(@Payload() body: UserCommand) {
    return this.toKafkaReply(() => this.getCurrentUser.execute(body.userId));
  }

  @MessagePattern('auth.update_me')
  updateMe(@Payload() body: UpdateMeCommand) {
    const { userId, ...profile } = body;
    return this.toKafkaReply(() =>
      this.updateCurrentUser.execute(userId, profile),
    );
  }

  @MessagePattern('auth.google_start')
  googleStart() {
    return this.toKafkaReply(() => this.google.createAuthorizationUrl());
  }

  @MessagePattern('auth.google_callback')
  async googleCallback(@Payload() body: GoogleCallbackCommand) {
    return this.toKafkaReply(async () => {
      const profile = await this.google.exchangeCode(body.code);
      return this.loginWithProvider.execute(profile);
    });
  }

  private async toKafkaReply<T>(
    action: () => Promise<T> | T,
  ): Promise<T | KafkaErrorReply> {
    try {
      return await action();
    } catch (error) {
      const statusCode =
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;

      return {
        ok: false,
        error: {
          code:
            error instanceof Error
              ? error.name
              : HttpStatus[statusCode] || 'DOWNSTREAM_ERROR',
          message:
            error instanceof Error ? error.message : 'Downstream service error',
          statusCode,
        },
      };
    }
  }
}
