import { Injectable } from '@nestjs/common';
import { AuthResult } from '../dto/auth-result';
import { ProviderProfile } from '../../domain/provider-profile';
import { AuthAccountService } from '../services/auth-account.service';
import { SessionIssuerService } from '../services/session-issuer.service';

@Injectable()
export class LoginWithProviderUseCase {
  constructor(
    private readonly accounts: AuthAccountService,
    private readonly sessions: SessionIssuerService,
  ) {}

  async execute(profile: ProviderProfile): Promise<AuthResult> {
    const user = await this.accounts.findOrCreateProviderUser(profile);
    return this.sessions.issue(user);
  }
}
