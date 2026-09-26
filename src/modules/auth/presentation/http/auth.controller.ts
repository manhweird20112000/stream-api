import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '@/shared/presentation/guards/jwt-auth.guard';
import { AuthUseCase } from '../../application/use-cases/auth.use-case';
import { LoginRequest } from './dto/login.request';
import { RefreshRequest } from './dto/refresh.request';
import { RegisterRequest } from './dto/register.request';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthUseCase) {}

  @Post('register')
  register(@Body() body: RegisterRequest) {
    return this.auth.register(body);
  }

  @Post('login')
  login(@Body() body: LoginRequest) {
    return this.auth.login(body);
  }

  @Post('refresh')
  refresh(@Body() body: RefreshRequest) {
    return this.auth.refresh(body);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() request: AuthenticatedRequest) {
    return this.auth.logout({ userId: request.user.sub });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.me({ userId: request.user.sub });
  }
}

