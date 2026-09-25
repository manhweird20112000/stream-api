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

  KAFKA_BROKERS = this.readList('KAFKA_BROKERS');
  KAFKA_CLIENT_ID = this.required('KAFKA_CLIENT_ID');
  KAFKA_GROUP_ID = this.required('KAFKA_GROUP_ID');

  JWT_SECRET = this.required('JWT_SECRET');
  TOKEN_EXPIRATION = this.required('TOKEN_EXPIRATION');

  private required(name: string): string {
    const value = this.get<string>(name);
    if (!value) throw new Error(`${name} is required`);
    return value;
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
