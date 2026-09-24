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
    const port = Number(this.required('APP_PORT'));
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('APP_PORT must be a valid port');
    }
    return port;
  }
}
