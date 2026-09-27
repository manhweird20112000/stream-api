import { Transport } from '@nestjs/microservices';
import { IAdapterSecret } from '@/infrastructure/secret/adapter';
import { createKafkaOptions } from './kafka.options';

describe('createKafkaOptions', () => {
  it('builds Nest Kafka transport options from service secrets', () => {
    const secrets = {
      KAFKA_BROKERS: ['localhost:19094', 'localhost:29094'],
      KAFKA_CLIENT_ID: 'stream-service',
      KAFKA_GROUP_ID: 'stream-service',
    } as IAdapterSecret;

    expect(createKafkaOptions(secrets)).toEqual({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: 'stream-service',
          brokers: ['localhost:19094', 'localhost:29094'],
        },
        consumer: {
          groupId: 'stream-service',
        },
      },
    });
  });
});
