import { Injectable } from '@nestjs/common';
import { InvalidCredentialsException } from '@/shared/exceptions';
import { PasswordHasher } from '../../domain/ports/password-hasher';
import { UserStatus } from '../../domain/auth-user';
import { AuthResult } from '../dto/auth-result';
import { AuthAccountService } from '../services/auth-account.service';
import { SessionIssuerService } from '../services/session-issuer.service';

export interface LoginWithPasswordInput {
  email: string;
  password: string;
}

@Injectable()
export class LoginWithPasswordUseCase {
  constructor(
    private readonly accounts: AuthAccountService,
    private readonly passwords: PasswordHasher,
    private readonly sessions: SessionIssuerService,
  ) {}

  async execute(input: LoginWithPasswordInput): Promise<AuthResult> {
    const user = await this.accounts.findByEmail(input.email);

    if (
      !user?.passwordHash ||
      !user.emailVerified ||
      user.status !== UserStatus.Active
    ) {
      throw new InvalidCredentialsException();
    }

    const valid = await this.passwords.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new InvalidCredentialsException();
    }

    return this.sessions.issue(user);
  }
}
