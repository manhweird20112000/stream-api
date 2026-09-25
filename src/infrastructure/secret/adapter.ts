export abstract class IAdapterSecret {
  abstract APP_NAME: string;
  abstract APP_PORT: number;

  abstract DATABASE_HOST: string;
  abstract DATABASE_PORT: number;
  abstract DATABASE_USER: string;
  abstract DATABASE_PASSWORD: string;
  abstract DATABASE_NAME: string;

  abstract JWT_SECRET: string;
  abstract TOKEN_EXPIRATION: string;
  abstract REFRESH_TOKEN_EXPIRATION_DAYS: number;

  abstract GOOGLE_CLIENT_ID: string;
  abstract GOOGLE_CLIENT_SECRET: string;
  abstract GOOGLE_CALLBACK_URL: string;
  abstract AUTH_SUCCESS_REDIRECT_URL: string;
  abstract AUTH_FAILURE_REDIRECT_URL: string;
}
