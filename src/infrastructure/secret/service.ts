import { ConfigService } from '@nestjs/config';
import { IAdapterSecret } from './adapter';

export class SecretService extends ConfigService implements IAdapterSecret {
  APP_NAME = this.required('APP_NAME');
  APP_PORT = this.readPort();

  KAFKA_BROKERS = this.readList('KAFKA_BROKERS');
  KAFKA_CLIENT_ID = this.required('KAFKA_CLIENT_ID');
  KAFKA_GROUP_ID = this.required('KAFKA_GROUP_ID');

  JWT_SECRET = this.required('JWT_SECRET');
  TOKEN_EXPIRATION = this.required('TOKEN_EXPIRATION');
  REFRESH_TOKEN_EXPIRATION_DAYS = this.readNumber(
    'REFRESH_TOKEN_EXPIRATION_DAYS',
    1,
    3650,
  );
  AUTH_SUCCESS_REDIRECT_URL = this.optional(
    'AUTH_SUCCESS_REDIRECT_URL',
    'http://localhost:3000/api/v1/auth/success',
  );
  AUTH_FAILURE_REDIRECT_URL = this.optional(
    'AUTH_FAILURE_REDIRECT_URL',
    'http://localhost:3000/api/v1/auth/failure',
  );

  private required(name: string): string {
    const value = this.get<string>(name);
    if (!value) throw new Error(`${name} is required`);
    return value;
  }

  private optional(name: string, fallback: string): string {
    return this.get<string>(name) || fallback;
  }

  private readList(name: string): string[] {
    const values = this.required(name)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (values.length === 0) {
      throw new Error(`${name} is required`);
    }

    return values;
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
}
