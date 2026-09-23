import { ConfigService } from '@nestjs/config';
import { IAdapterSecret } from './adapter';

export class SecretService extends ConfigService implements IAdapterSecret {
  APP_NAME = this.required('APP_NAME');
  APP_PORT = this.readPort();

  POSTGRES_URI = `postgres://${this.required('DB_USER')}:${this.required(
    'DB_PASSWORD',
  )}@${this.required('DB_HOST')}:${this.required('DB_PORT')}/${this.required('DB_NAME')}`;

  POSTGRES_SYNC = this.get('DB_SYNC') === 'true';

  JWT_SECRET = this.required('JWT_SECRET');
  TOKEN_EXPIRATION = this.required('TOKEN_EXPIRATION');

  STRIPE_API_KEY = this.get('STRIPE_API_KEY');

  private required(name: string): string {
    const value = this.get<string>(name);
    if (!value) throw new Error(`${name} is required`);
    return value;
  }

  private readPort(): number {
    const port = Number(this.required('APP_PORT'));
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('APP_PORT must be a valid port');
    }
    return port;
  }
}
