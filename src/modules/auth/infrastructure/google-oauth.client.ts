import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IAdapterSecret } from '@/infrastructure/secret/adapter';
import { AuthProvider } from '../domain/auth-provider';
import { ProviderProfile } from '../domain/provider-profile';

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
}

interface GoogleUserInfoResponse {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

@Injectable()
export class GoogleOAuthClient {
  private readonly authEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly tokenEndpoint = 'https://oauth2.googleapis.com/token';
  private readonly userInfoEndpoint = 'https://openidconnect.googleapis.com/v1/userinfo';

  constructor(private readonly secrets: IAdapterSecret) {}

  createAuthorizationUrl(): { url: string; state: string } {
    this.assertConfigured();

    const state = randomUUID();
    const url = new URL(this.authEndpoint);
    url.searchParams.set('client_id', this.secrets.GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri', this.secrets.GOOGLE_CALLBACK_URL);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('prompt', 'select_account');
    url.searchParams.set('state', state);

    return { url: url.toString(), state };
  }

  async exchangeCode(code: string): Promise<ProviderProfile> {
    this.assertConfigured();

    const tokenResponse = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.secrets.GOOGLE_CLIENT_ID,
        client_secret: this.secrets.GOOGLE_CLIENT_SECRET,
        redirect_uri: this.secrets.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new UnauthorizedException('Google authorization failed');
    }

    const token = (await tokenResponse.json()) as GoogleTokenResponse;
    if (!token.access_token) {
      throw new UnauthorizedException('Google access token is missing');
    }

    const userInfoResponse = await fetch(this.userInfoEndpoint, {
      headers: { authorization: `Bearer ${token.access_token}` },
    });

    if (!userInfoResponse.ok) {
      throw new UnauthorizedException('Google profile request failed');
    }

    const profile = (await userInfoResponse.json()) as GoogleUserInfoResponse;
    if (!profile.sub || !profile.email) {
      throw new UnauthorizedException('Google profile is incomplete');
    }

    return {
      provider: AuthProvider.Google,
      providerUserId: profile.sub,
      email: profile.email,
      emailVerified: profile.email_verified === true,
      displayName: profile.name ?? null,
      avatarUrl: profile.picture ?? null,
      metadata: {
        tokenType: token.token_type ?? null,
        scope: token.scope ?? null,
        expiresIn: token.expires_in ?? null,
      },
    };
  }

  private assertConfigured(): void {
    if (
      !this.secrets.GOOGLE_CLIENT_ID ||
      !this.secrets.GOOGLE_CLIENT_SECRET ||
      !this.secrets.GOOGLE_CALLBACK_URL
    ) {
      throw new ServiceUnavailableException('Google OAuth is not configured');
    }
  }
}
