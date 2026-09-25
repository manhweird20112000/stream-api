import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthIdentity } from '../../domain/auth-identity';
import { AuthProvider } from '../../domain/auth-provider';
import { SavedAuthUser, UserStatus } from '../../domain/auth-user';
import { AuthIdentityRepository } from '../../domain/ports/auth-identity.repository';
import { AuthUserRepository } from '../../domain/ports/auth-user.repository';
import { ProviderProfile } from '../../domain/provider-profile';

@Injectable()
export class AuthAccountService {
  constructor(
    private readonly users: AuthUserRepository,
    private readonly identities: AuthIdentityRepository,
  ) {}

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async findByEmail(email: string): Promise<SavedAuthUser | null> {
    return this.users.findByEmail(this.normalizeEmail(email));
  }

  async findOrCreateProviderUser(
    profile: ProviderProfile,
  ): Promise<SavedAuthUser> {
    const email = this.normalizeEmail(profile.email);
    const existingIdentity = await this.identities.findByProvider(
      profile.provider,
      profile.providerUserId,
    );

    if (existingIdentity?.user) {
      await this.updateIdentity(existingIdentity, profile, email);
      return existingIdentity.user;
    }

    let user = await this.users.findByEmail(email);
    if (user && !profile.emailVerified) {
      throw new UnauthorizedException('Provider email is not verified');
    }

    if (!user) {
      user = await this.users.save({
        email,
        emailVerified: profile.emailVerified,
        displayName: profile.displayName ?? null,
        avatarUrl: profile.avatarUrl ?? null,
        passwordHash: null,
        status: UserStatus.Active,
      });
    } else {
      user = await this.users.save({
        ...user,
        emailVerified: user.emailVerified || profile.emailVerified,
        status: profile.emailVerified ? UserStatus.Active : user.status,
        displayName: user.displayName ?? profile.displayName ?? null,
        avatarUrl: user.avatarUrl ?? profile.avatarUrl ?? null,
      });
    }

    await this.ensureIdentity({
      user,
      provider: profile.provider,
      providerUserId: profile.providerUserId,
      providerEmail: email,
      providerEmailVerified: profile.emailVerified,
      metadata: profile.metadata ?? null,
    });

    return user;
  }

  private async ensureIdentity(input: {
    user: SavedAuthUser;
    provider: AuthProvider;
    providerUserId: string;
    providerEmail: string | null;
    providerEmailVerified: boolean;
    metadata: Record<string, unknown> | null;
  }): Promise<void> {
    const existing = await this.identities.findByUserAndProvider(
      input.user.id,
      input.provider,
    );

    await this.identities.save({
      id: existing?.id,
      userId: input.user.id,
      user: input.user,
      provider: input.provider,
      providerUserId: input.providerUserId,
      providerEmail: input.providerEmail,
      providerEmailVerified: input.providerEmailVerified,
      metadata: input.metadata,
    });
  }

  private async updateIdentity(
    identity: AuthIdentity,
    profile: ProviderProfile,
    email: string,
  ): Promise<void> {
    await this.identities.save({
      ...identity,
      providerEmail: email,
      providerEmailVerified: profile.emailVerified,
      metadata: profile.metadata ?? identity.metadata,
    });
  }
}
