import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom, Subscription, TimeoutError, timeout } from 'rxjs';
import { AUTH_TOPICS, KAFKA_CLIENT, STREAM_TOPICS } from './kafka.constants';
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
  private static readonly reconnectDelayMs = 5000;

  private ready = false;
  private destroyed = false;
  private connectionGeneration = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private statusSubscription?: Subscription;

  constructor(@Inject(KAFKA_CLIENT) private readonly client: ClientKafka) {}

  onModuleInit(): void {
    this.destroyed = false;
    this.client.subscribeToResponseOf(STREAM_TOPICS.commands);
    this.client.subscribeToResponseOf(AUTH_TOPICS.commands);
    this.statusSubscription = this.client.status.subscribe((status) => {
      if (status !== 'connected') {
        this.ready = false;
        this.connectionGeneration += 1;
        this.scheduleReconnect(true);
      }
    });
    this.connectWithRetry();
  }

  async onModuleDestroy(): Promise<void> {
    this.destroyed = true;
    this.ready = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.statusSubscription?.unsubscribe();
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

      if (error instanceof TimeoutError) {
        throw new KafkaGatewayTimeoutError();
      }

      throw new KafkaGatewayDownstreamError(
        'DOWNSTREAM_ERROR',
        'Downstream service error',
      );
    }
  }

  private connectWithRetry(): void {
    const generation = this.connectionGeneration;

    void this.client
      .connect()
      .then(() => {
        if (this.destroyed || generation !== this.connectionGeneration) {
          return;
        }

        this.ready = true;
      })
      .catch(() => {
        if (this.destroyed || generation !== this.connectionGeneration) {
          return;
        }

        this.ready = false;
        this.connectionGeneration += 1;
        void this.resetClient().finally(() => this.scheduleReconnect());
      });
  }

  private scheduleReconnect(resetClient = false): void {
    if (this.destroyed || this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (resetClient) {
        void this.resetClient().finally(() => this.connectWithRetry());
        return;
      }

      this.connectWithRetry();
    }, KafkaGatewayService.reconnectDelayMs);
  }

  private async resetClient(): Promise<void> {
    try {
      await this.client.close();
    } catch {
      this.ready = false;
    }
  }
}
