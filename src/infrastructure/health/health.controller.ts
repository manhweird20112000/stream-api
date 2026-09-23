import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { KafkaGatewayService } from '@/infrastructure/kafka/kafka-gateway.service';

@Controller('health')
export class HealthController {
  constructor(private readonly kafka: KafkaGatewayService) {}

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  ready() {
    if (!this.kafka.isReady()) {
      throw new ServiceUnavailableException('Kafka is not ready');
    }

    return {
      status: 'ok',
      dependencies: { kafka: 'ok' },
    };
  }
}
