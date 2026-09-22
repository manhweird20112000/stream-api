import * as bcrypt from 'bcrypt';

export class PasswordVO {
  constructor(public readonly value: string) {
    if (value.length < 6) {
      throw new Error('Password must be between 6 and 32 characters');
    }
  }

  static create(value: string) {
    if (value.length > 32) {
      throw new Error('Password must be between 6 and 32 characters');
    }
    return new PasswordVO(value);
  }

  static async hash(value: string) {
    PasswordVO.create(value);
    const password = await bcrypt.hash(value, 10);
    return new PasswordVO(password);
  }

  static async compare(value: string, hashedValue: string) {
    return bcrypt.compare(value, hashedValue);
  }

  getValue(): string {
    return this.value;
  }
}
