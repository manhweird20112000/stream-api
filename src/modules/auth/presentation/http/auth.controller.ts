import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { IAdapterSecret } from '@/infrastructure/secret/adapter';
import { InvalidCredentialsException } from '@/shared/exceptions';
import { JwtAuthGuard } from '@/shared/presentation/guards/jwt-auth.guard';
import { AuthResult } from '../../application/dto/auth-result';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user.use-case';
import { LoginWithPasswordUseCase } from '../../application/use-cases/login-with-password.use-case';
import { LoginWithProviderUseCase } from '../../application/use-cases/login-with-provider.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { RefreshSessionUseCase } from '../../application/use-cases/refresh-session.use-case';
import { RegisterWithPasswordUseCase } from '../../application/use-cases/register-with-password.use-case';
import { VerifyEmailUseCase } from '../../application/use-cases/verify-email.use-case';
import { GoogleOAuthClient } from '../../infrastructure/google-oauth.client';
import { LoginRequest } from './dto/login.request';
import { RefreshTokenRequest } from './dto/refresh-token.request';
import { RegisterRequest } from './dto/register.request';
import { VerifyEmailRequest } from './dto/verify-email.request';

const OAUTH_STATE_COOKIE = 'oauth_state';
const REFRESH_TOKEN_COOKIE = 'refresh_token';
const REFRESH_TOKEN_COOKIE_PATH = '/api/v1/auth';

type PublicAuthResult = Omit<AuthResult, 'refreshToken'>;

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
  };
}

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly registerWithPassword: RegisterWithPasswordUseCase,
    private readonly loginWithPassword: LoginWithPasswordUseCase,
    private readonly loginWithProvider: LoginWithProviderUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly logoutSession: LogoutUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly verifyEmail: VerifyEmailUseCase,
    private readonly google: GoogleOAuthClient,
    private readonly secrets: IAdapterSecret,
  ) {}

  @Post('register')
  async register(
    @Body() body: RegisterRequest,
  ) {
    return this.registerWithPassword.execute(body);
  }

  @Post('verify-email')
  async verifyEmailCode(
    @Body() body: VerifyEmailRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicAuthResult> {
    return this.withRefreshCookie(
      response,
      await this.verifyEmail.execute(body),
    );
  }

  @Post('login')
  async login(
    @Body() body: LoginRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicAuthResult> {
    return this.withRefreshCookie(
      response,
      await this.loginWithPassword.execute(body),
    );
  }

  @Post('refresh')
  async refresh(
    @Body() body: RefreshTokenRequest,
    @Headers('cookie') cookie: string | undefined,
    @Headers('user-agent') userAgent: string | undefined,
    @Ip() ipAddress: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicAuthResult> {
    const result = await this.refreshSession.execute({
      refreshToken: this.readRefreshToken(body, cookie),
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
    });
    return this.withRefreshCookie(response, result);
  }

  @Post('logout')
  async logout(
    @Body() body: RefreshTokenRequest,
    @Headers('cookie') cookie: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ revoked: true }> {
    await this.logoutSession.execute({
      refreshToken: this.readRefreshToken(body, cookie),
    });
    response.clearCookie(REFRESH_TOKEN_COOKIE, {
      path: REFRESH_TOKEN_COOKIE_PATH,
    });
    return { revoked: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.getCurrentUser.execute(request.user.sub);
  }

  @Get('google/start')
  startGoogle(@Res() response: Response): void {
    const { url, state } = this.google.createAuthorizationUrl();
    response.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000,
      path: '/api/v1/auth/google/callback',
    });
    response.redirect(url);
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Headers('cookie') cookie: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    response.clearCookie(OAUTH_STATE_COOKIE, {
      path: '/api/v1/auth/google/callback',
    });

    if (!code || !state || state !== this.readCookie(cookie, OAUTH_STATE_COOKIE)) {
      response.redirect(this.failureRedirectUrl('oauth_state_invalid'));
      return;
    }

    try {
      const profile = await this.google.exchangeCode(code);
      const result = await this.loginWithProvider.execute(profile);
      this.setRefreshCookie(response, result.refreshToken);
      response.redirect(this.successRedirectUrl(result.accessToken));
    } catch {
      response.redirect(this.failureRedirectUrl('oauth_failed'));
    }
  }

  private successRedirectUrl(accessToken: string): string {
    const separator = this.secrets.AUTH_SUCCESS_REDIRECT_URL.includes('#')
      ? '&'
      : '#';
    return `${this.secrets.AUTH_SUCCESS_REDIRECT_URL}${separator}access_token=${encodeURIComponent(accessToken)}`;
  }

  private withRefreshCookie(
    response: Response,
    result: AuthResult,
  ): PublicAuthResult {
    this.setRefreshCookie(response, result.refreshToken);
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  private setRefreshCookie(response: Response, refreshToken: string): void {
    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: this.secrets.REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
      path: REFRESH_TOKEN_COOKIE_PATH,
    });
  }

  private failureRedirectUrl(error: string): string {
    const url = new URL(this.secrets.AUTH_FAILURE_REDIRECT_URL);
    url.searchParams.set('error', error);
    return url.toString();
  }

  private readRefreshToken(
    body: RefreshTokenRequest | undefined,
    cookieHeader: string | undefined,
  ): string {
    const token =
      body?.refreshToken ?? this.readCookie(cookieHeader, REFRESH_TOKEN_COOKIE);

    if (!token) {
      throw new InvalidCredentialsException();
    }

    return token;
  }

  private readCookie(cookieHeader: string | undefined, name: string): string | null {
    if (!cookieHeader) {
      return null;
    }

    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    const prefix = `${name}=`;
    const cookie = cookies.find((value) => value.startsWith(prefix));
    return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
  }
}
