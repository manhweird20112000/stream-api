import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { STREAM_TOPICS } from '@/infrastructure/kafka/kafka.constants';
import { KafkaGatewayService } from '@/infrastructure/kafka/kafka-gateway.service';
import {
  CreateStreamInput,
  CreateStreamOutput,
  CreateStreamPayload,
} from '../dto/create-stream.input';

@Injectable()
export class CreateStreamUseCase {
  constructor(private readonly kafka: KafkaGatewayService) {}

  execute(input: CreateStreamInput): Promise<CreateStreamOutput> {
    return this.kafka.request<CreateStreamOutput, CreateStreamPayload>(
      STREAM_TOPICS.commands,
      {
        requestId: randomUUID(),
        userId: input.userId,
        type: 'stream.create',
        payload: {
          title: input.title,
          description: input.description,
        },
      },
    );
  }
}
