import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { SecretModule } from '@/infrastructure/secret';
import { IAdapterSecret } from '@/infrastructure/secret/adapter';
import { KAFKA_CLIENT } from './kafka.constants';
import { KafkaGatewayService } from './kafka-gateway.service';
import { createKafkaOptions } from './kafka.options';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: KAFKA_CLIENT,
        imports: [SecretModule],
        inject: [IAdapterSecret],
        useFactory: createKafkaOptions,
      },
    ]),
  ],
  providers: [KafkaGatewayService],
  exports: [KafkaGatewayService],
})
export class KafkaModule {}
