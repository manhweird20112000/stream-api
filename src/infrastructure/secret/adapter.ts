import type { JwtModuleOptions } from '@nestjs/jwt';

type JwtExpiresIn = NonNullable<JwtModuleOptions['signOptions']>['expiresIn'];

export abstract class IAdapterSecret {
  abstract APP_NAME: string;
  abstract APP_PORT: number;

  abstract DATABASE_ENABLED: boolean;
  abstract DATABASE_HOST: string;
  abstract DATABASE_PORT: number;
  abstract DATABASE_USER: string;
  abstract DATABASE_PASSWORD: string;
  abstract DATABASE_NAME: string;

  abstract KAFKA_BROKERS: string[];
  abstract KAFKA_CLIENT_ID: string;
  abstract KAFKA_GROUP_ID: string;

  abstract JWT_SECRET: string;
  abstract TOKEN_EXPIRATION: JwtExpiresIn;
}
