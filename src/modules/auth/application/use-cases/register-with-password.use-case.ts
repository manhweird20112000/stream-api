import { Injectable } from '@nestjs/common';
import { EmailRegistrationRepository } from '../../domain/auth-email-verification';
import { PasswordHasher } from '../../domain/ports/password-hasher';
import { VerificationCodeService } from '../../domain/ports/verification-code.service';

export interface RegisterWithPasswordInput {
  email: string;
  password: string;
}

export interface RegisterWithPasswordOutput {
  email: string;
  verificationRequired: true;
}

@Injectable()
export class RegisterWithPasswordUseCase {
  constructor(
    private readonly registrations: EmailRegistrationRepository,
    private readonly passwords: PasswordHasher,
    private readonly verificationCodes: VerificationCodeService,
  ) {}

  async execute(
    input: RegisterWithPasswordInput,
  ): Promise<RegisterWithPasswordOutput> {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await this.passwords.hash(input.password);
    const code = this.verificationCodes.generate();

    await this.registrations.saveDraft({
      email,
      passwordHash,
      rawCode: code,
      codeHash: this.verificationCodes.hash(code),
      expiresAt: this.verificationCodes.expiresAt(),
    });

    return {
      email,
      verificationRequired: true,
    };
  }
}
