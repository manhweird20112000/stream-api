export abstract class IAdapterSecret {
  abstract APP_NAME: string;
  abstract APP_PORT: number;

  abstract POSTGRES_URI: string;
  abstract POSTGRES_SYNC: boolean;

  abstract JWT_SECRET: string;
  abstract TOKEN_EXPIRATION: string;

  abstract STRIPE_API_KEY: string;
}
