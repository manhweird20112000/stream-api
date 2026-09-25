import { ConfigService } from '@nestjs/config';
import { IAdapterSecret } from './adapter';

export class SecretService extends ConfigService implements IAdapterSecret {
  APP_NAME = this.required('APP_NAME');
  APP_PORT = this.readPort();

  DATABASE_HOST = this.required('DATABASE_HOST');
  DATABASE_PORT = this.readNumber('DATABASE_PORT', 1, 65535);
  DATABASE_USER = this.required('DATABASE_USER');
  DATABASE_PASSWORD = this.required('DATABASE_PASSWORD');
  DATABASE_NAME = this.required('DATABASE_NAME');

  JWT_SECRET = this.required('JWT_SECRET');
  TOKEN_EXPIRATION = this.required('TOKEN_EXPIRATION');
  REFRESH_TOKEN_EXPIRATION_DAYS = this.optionalNumber(
    'REFRESH_TOKEN_EXPIRATION_DAYS',
    30,
    1,
    365,
  );

  GOOGLE_CLIENT_ID = this.optional('GOOGLE_CLIENT_ID');
  GOOGLE_CLIENT_SECRET = this.optional('GOOGLE_CLIENT_SECRET');
  GOOGLE_CALLBACK_URL = this.optional('GOOGLE_CALLBACK_URL');
  AUTH_SUCCESS_REDIRECT_URL = this.optional(
    'AUTH_SUCCESS_REDIRECT_URL',
    'http://localhost:3000/auth/success',
  );
  AUTH_FAILURE_REDIRECT_URL = this.optional(
    'AUTH_FAILURE_REDIRECT_URL',
    'http://localhost:3000/auth/failure',
  );

  private required(name: string): string {
    const value = this.get<string>(name);
    if (!value) throw new Error(`${name} is required`);
    return value;
  }

  private optional(name: string, defaultValue = ''): string {
    return this.get<string>(name) || defaultValue;
  }

  private readPort(): number {
    return this.readNumber('APP_PORT', 1, 65535);
  }

  private readNumber(name: string, min: number, max: number): number {
    const port = Number(this.required(name));
    if (!Number.isInteger(port) || port < min || port > max) {
      throw new Error(`${name} must be a valid port`);
    }
    return port;
  }

  private optionalNumber(
    name: string,
    defaultValue: number,
    min: number,
    max: number,
  ): number {
    const raw = this.get<string>(name);
    if (!raw) {
      return defaultValue;
    }

    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new Error(`${name} must be a valid number`);
    }
    return value;
  }
}
