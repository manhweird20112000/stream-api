import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { KAFKA_CLIENT, STREAM_TOPICS } from './kafka.constants';
import {
  KafkaGatewayDownstreamError,
  KafkaGatewayTimeoutError,
} from './kafka.errors';

export interface KafkaCommandEnvelope<TPayload> {
  requestId: string;
  userId?: string;
  type: string;
  payload: TPayload;
}

interface KafkaReplyEnvelope<TData> {
  ok: boolean;
  data?: TData;
  error?: {
    code?: string;
    message?: string;
  };
}

@Injectable()
export class KafkaGatewayService implements OnModuleInit, OnModuleDestroy {
  private ready = false;

  constructor(@Inject(KAFKA_CLIENT) private readonly client: ClientKafka) {}

  async onModuleInit(): Promise<void> {
    this.client.subscribeToResponseOf(STREAM_TOPICS.commands);
    await this.client.connect();
    this.ready = true;
  }

  async onModuleDestroy(): Promise<void> {
    this.ready = false;
    await this.client.close();
  }

  isReady(): boolean {
    return this.ready;
  }

  async request<TData, TPayload>(
    topic: string,
    message: KafkaCommandEnvelope<TPayload>,
    timeoutMs = 5000,
  ): Promise<TData> {
    try {
      const reply = await firstValueFrom(
        this.client
          .send<KafkaReplyEnvelope<TData>, KafkaCommandEnvelope<TPayload>>(
            topic,
            message,
          )
          .pipe(timeout({ first: timeoutMs })),
      );

      if (!reply.ok) {
        throw new KafkaGatewayDownstreamError(
          reply.error?.code ?? 'DOWNSTREAM_ERROR',
          reply.error?.message ?? 'Downstream service error',
        );
      }

      return reply.data as TData;
    } catch (error) {
      if (error instanceof KafkaGatewayDownstreamError) {
        throw error;
      }

      throw new KafkaGatewayTimeoutError();
    }
  }
}
