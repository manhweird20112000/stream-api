import { Injectable } from '@nestjs/common';
import { InvalidCredentialsException } from '@/shared/exceptions';
import { EmailRegistrationRepository } from '../../domain/auth-email-verification';
import { VerificationCodeService } from '../../domain/ports/verification-code.service';
import { AuthResult } from '../dto/auth-result';
import { SessionIssuerService } from '../services/session-issuer.service';

export interface VerifyEmailInput {
  email: string;
  code: string;
}

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    private readonly registrations: EmailRegistrationRepository,
    private readonly verificationCodes: VerificationCodeService,
    private readonly sessions: SessionIssuerService,
  ) {}

  async execute(input: VerifyEmailInput): Promise<AuthResult> {
    const user = await this.registrations.verifyEmail({
      email: input.email.trim().toLowerCase(),
      codeHash: this.verificationCodes.hash(input.code),
    });

    if (!user) {
      throw new InvalidCredentialsException('Invalid verification code');
    }

    return this.sessions.issue(user);
  }
}
