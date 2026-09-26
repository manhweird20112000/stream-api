export abstract class IAdapterSecret {
  abstract APP_NAME: string;
  abstract APP_PORT: number;

  abstract KAFKA_BROKERS: string[];
  abstract KAFKA_CLIENT_ID: string;
  abstract KAFKA_GROUP_ID: string;

  abstract JWT_SECRET: string;
  abstract TOKEN_EXPIRATION: string;
  abstract REFRESH_TOKEN_EXPIRATION_DAYS: number;
  abstract AUTH_SUCCESS_REDIRECT_URL: string;
  abstract AUTH_FAILURE_REDIRECT_URL: string;
}
