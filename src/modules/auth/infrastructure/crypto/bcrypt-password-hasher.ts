import { Injectable } from '@nestjs/common';
import { PasswordVO } from '@/shared/domain/value-objects';
import { PasswordHasher } from '../../domain/ports/password-hasher';

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return (await PasswordVO.hash(password)).getValue();
  }

  compare(password: string, hashedPassword: string): Promise<boolean> {
    return PasswordVO.compare(password, hashedPassword);
  }
}

