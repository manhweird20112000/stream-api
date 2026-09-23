import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SecretModule } from '@/infrastructure/secret';
import { IAdapterSecret } from '@/infrastructure/secret/adapter';
import { KAFKA_CLIENT } from './kafka.constants';
import { KafkaGatewayService } from './kafka-gateway.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: KAFKA_CLIENT,
        imports: [SecretModule],
        inject: [IAdapterSecret],
        useFactory: (secrets: IAdapterSecret) => ({
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
        }),
      },
    ]),
  ],
  providers: [KafkaGatewayService],
  exports: [KafkaGatewayService],
})
export class KafkaModule {}
