import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Patch,
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
import { AuthUseCase } from '../../application/use-cases/auth.use-case';
import { LoginRequest } from './dto/login.request';
import { RefreshRequest } from './dto/refresh.request';
import { RegisterRequest } from './dto/register.request';
import { UpdateMeRequest } from './dto/update-me.request';
import { VerifyEmailRequest } from './dto/verify-email.request';

const OAUTH_STATE_COOKIE = 'oauth_state';
const REFRESH_TOKEN_COOKIE = 'refresh_token';
const REFRESH_TOKEN_COOKIE_PATH = '/api/v1/auth';

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: unknown;
}

type PublicAuthResult = Omit<AuthResult, 'refreshToken'>;

interface GoogleStartResult {
  url: string;
  state: string;
}

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
  };
}

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthUseCase,
    private readonly secrets: IAdapterSecret,
  ) {}

  @Post('register')
  register(@Body() body: RegisterRequest) {
    return this.auth.register(body);
  }

  @Post('verify-email')
  async verifyEmailCode(
    @Body() body: VerifyEmailRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicAuthResult> {
    return this.withRefreshCookie(
      response,
      (await this.auth.verifyEmail(body)) as AuthResult,
    );
  }

  @Post('login')
  async login(
    @Body() body: LoginRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicAuthResult> {
    return this.withRefreshCookie(
      response,
      (await this.auth.login(body)) as AuthResult,
    );
  }

  @Post('refresh')
  async refresh(
    @Body() body: RefreshRequest,
    @Headers('cookie') cookie: string | undefined,
    @Headers('user-agent') userAgent: string | undefined,
    @Ip() ipAddress: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicAuthResult> {
    const result = (await this.auth.refresh({
      refreshToken: this.readRefreshToken(body, cookie),
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
    })) as AuthResult;

    return this.withRefreshCookie(response, result);
  }

  @Post('logout')
  async logout(
    @Headers('cookie') cookie: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<unknown> {
    const result = await this.auth.logout({
      refreshToken: this.readRefreshTokenFromCookie(cookie),
    });
    response.clearCookie(REFRESH_TOKEN_COOKIE, {
      path: REFRESH_TOKEN_COOKIE_PATH,
    });
    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.me({ userId: request.user.sub });
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@Req() request: AuthenticatedRequest, @Body() body: UpdateMeRequest) {
    return this.auth.updateMe({ userId: request.user.sub, ...body });
  }

  @Get('google/start')
  async startGoogle(@Res() response: Response): Promise<void> {
    const { url, state } = (await this.auth.googleStart()) as GoogleStartResult;
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
      const result = (await this.auth.googleCallback({ code })) as AuthResult;
      this.setRefreshCookie(response, result.refreshToken);
      response.redirect(this.successRedirectUrl(result.accessToken));
    } catch {
      response.redirect(this.failureRedirectUrl('oauth_failed'));
    }
  }

  @Get('success')
  authSuccess(): { message: string } {
    return { message: 'Authentication succeeded' };
  }

  @Get('failure')
  authFailure(@Query('error') error: string | undefined): { error: string } {
    return { error: error ?? 'oauth_failed' };
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

  private successRedirectUrl(accessToken: string): string {
    const separator = this.secrets.AUTH_SUCCESS_REDIRECT_URL.includes('#')
      ? '&'
      : '#';
    return `${this.secrets.AUTH_SUCCESS_REDIRECT_URL}${separator}access_token=${encodeURIComponent(accessToken)}`;
  }

  private failureRedirectUrl(error: string): string {
    const url = new URL(this.secrets.AUTH_FAILURE_REDIRECT_URL);
    url.searchParams.set('error', error);
    return url.toString();
  }

  private readRefreshToken(
    body: RefreshRequest | undefined,
    cookieHeader: string | undefined,
  ): string {
    const token =
      body?.refreshToken ?? this.readCookie(cookieHeader, REFRESH_TOKEN_COOKIE);

    if (!token) {
      throw new InvalidCredentialsException();
    }

    return token;
  }

  private readRefreshTokenFromCookie(cookieHeader: string | undefined): string {
    const token = this.readCookie(cookieHeader, REFRESH_TOKEN_COOKIE);

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
