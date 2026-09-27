import { Transport, type KafkaOptions } from '@nestjs/microservices';
import { IAdapterSecret } from '@/infrastructure/secret/adapter';

export function createKafkaOptions(secrets: IAdapterSecret): KafkaOptions {
  return {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: secrets.KAFKA_CLIENT_ID,
        brokers: secrets.KAFKA_BROKERS,
      },
      consumer: {
        groupId: secrets.KAFKA_GROUP_ID,
      },
    },
  };
}
