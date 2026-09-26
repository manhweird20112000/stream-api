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
  DATABASE_MIGRATIONS_RUN = this.optionalBoolean(
    'DATABASE_MIGRATIONS_RUN',
    process.env.NODE_ENV !== 'production',
  );

  KAFKA_BROKERS = this.optionalList('KAFKA_BROKERS', ['localhost:9092']);
  KAFKA_CLIENT_ID = this.optional('KAFKA_CLIENT_ID', this.APP_NAME);
  KAFKA_GROUP_ID = this.optional('KAFKA_GROUP_ID', this.APP_NAME);

  JWT_SECRET = this.required('JWT_SECRET');
  TOKEN_EXPIRATION = this.required('TOKEN_EXPIRATION');
  REFRESH_TOKEN_EXPIRATION_DAYS = this.optionalNumber(
    'REFRESH_TOKEN_EXPIRATION_DAYS',
    30,
    1,
    365,
  );

  EMAIL_DELIVERY_ENABLED = this.optionalBoolean(
    'EMAIL_DELIVERY_ENABLED',
    false,
  );
  SMTP_HOST = this.optional('SMTP_HOST', 'localhost');
  SMTP_PORT = this.optionalNumber('SMTP_PORT', 1025, 1, 65535);
  MAIL_FROM = this.optional('MAIL_FROM', 'no-reply@stream.local');

  GOOGLE_CLIENT_ID = this.optional('GOOGLE_CLIENT_ID');
  GOOGLE_CLIENT_SECRET = this.optional('GOOGLE_CLIENT_SECRET');
  API_GATEWAY_URL = this.optional('API_GATEWAY_URL', 'http://localhost:3000');
  GOOGLE_CALLBACK_URL = this.optional(
    'GOOGLE_CALLBACK_URL',
    this.publicAuthUrl('/api/v1/auth/google/callback'),
  );
  AUTH_SUCCESS_REDIRECT_URL = this.optional(
    'AUTH_SUCCESS_REDIRECT_URL',
    this.publicAuthUrl('/api/v1/auth/success'),
  );
  AUTH_FAILURE_REDIRECT_URL = this.optional(
    'AUTH_FAILURE_REDIRECT_URL',
    this.publicAuthUrl('/api/v1/auth/failure'),
  );

  private required(name: string): string {
    const value = this.get<string>(name);
    if (!value) throw new Error(`${name} is required`);
    return value;
  }

  private optional(name: string, defaultValue = ''): string {
    return this.get<string>(name) || defaultValue;
  }

  private optionalList(name: string, defaultValue: string[]): string[] {
    const raw = this.get<string>(name);
    if (!raw) {
      return defaultValue;
    }

    return raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  private publicAuthUrl(path: string): string {
    return `${this.API_GATEWAY_URL.replace(/\/+$/, '')}${path}`;
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

  private optionalBoolean(name: string, defaultValue: boolean): boolean {
    const raw = this.get<string>(name);
    if (!raw) {
      return defaultValue;
    }

    if (raw === 'true') {
      return true;
    }

    if (raw === 'false') {
      return false;
    }

    throw new Error(`${name} must be true or false`);
  }
}
