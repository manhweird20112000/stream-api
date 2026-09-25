export abstract class RefreshTokenService {
  abstract generate(): string;
  abstract hash(refreshToken: string): string;
  abstract expiresAt(): Date;
}

