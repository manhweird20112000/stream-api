import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SavedAuthUser } from '../../domain/auth-user';
import { AccessTokenService } from '../../domain/ports/access-token.service';

@Injectable()
export class JwtAccessTokenService implements AccessTokenService {
  constructor(private readonly jwt: JwtService) {}

  sign(user: SavedAuthUser): Promise<string> {
    return this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });
  }
}

