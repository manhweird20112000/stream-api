export abstract class VerificationCodeService {
  abstract generate(): string;
  abstract hash(code: string): string;
  abstract expiresAt(): Date;
}

