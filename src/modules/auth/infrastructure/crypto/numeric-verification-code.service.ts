import { Injectable } from '@nestjs/common';
import { createHash, randomInt } from 'node:crypto';
import { VerificationCodeService } from '../../domain/ports/verification-code.service';

@Injectable()
export class NumericVerificationCodeService implements VerificationCodeService {
  generate(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  expiresAt(): Date {
    return new Date(Date.now() + 15 * 60 * 1000);
  }
}

