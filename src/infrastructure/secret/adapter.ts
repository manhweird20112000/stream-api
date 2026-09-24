export abstract class IAdapterSecret {
  abstract APP_NAME: string;
  abstract APP_PORT: number;

  abstract KAFKA_BROKERS: string[];
  abstract KAFKA_CLIENT_ID: string;
  abstract KAFKA_GROUP_ID: string;

  abstract JWT_SECRET: string;
  abstract TOKEN_EXPIRATION: string;
}
