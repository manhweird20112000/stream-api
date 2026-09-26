import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IAdapterSecret } from '@/infrastructure/secret/adapter';
import { EmailSender } from '../../domain/ports/email-sender';
import {
  OutboxEventEntity,
  OutboxEventStatus,
} from '../persistence/entities/outbox-event.entity';

const EMAIL_VERIFICATION_REQUESTED = 'auth.email_verification_requested';
const POLL_INTERVAL_MS = 10_000;

interface EmailVerificationPayload {
  email: string;
  code: string;
}

@Injectable()
export class EmailOutboxProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailOutboxProcessor.name);
  private interval: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly emails: EmailSender,
    private readonly secrets: IAdapterSecret,
  ) {}

  onModuleInit(): void {
    void this.processPending();
    this.interval = setInterval(() => void this.processPending(), POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async processPending(): Promise<void> {
    if (!this.secrets.EMAIL_DELIVERY_ENABLED) {
      return;
    }

    if (this.running) {
      return;
    }

    this.running = true;
    try {
      const outbox = this.dataSource.getRepository(OutboxEventEntity);
      const events = await outbox.find({
        where: {
          status: OutboxEventStatus.Pending,
          type: EMAIL_VERIFICATION_REQUESTED,
        },
        order: { createdAt: 'ASC' },
        take: 10,
      });

      for (const event of events) {
        await this.processEvent(event);
      }
    } finally {
      this.running = false;
    }
  }

  private async processEvent(event: OutboxEventEntity): Promise<void> {
    try {
      const payload = this.readPayload(event);
      await this.emails.send({
        to: payload.email,
        subject: 'Verify your Stream account',
        text: [
          'Use this code to verify your Stream account:',
          '',
          payload.code,
          '',
          'This code expires soon.',
        ].join('\n'),
      });

      event.status = OutboxEventStatus.Processed;
      event.processedAt = new Date();
      await this.dataSource.getRepository(OutboxEventEntity).save(event);
    } catch (error) {
      this.logger.warn(
        `Email outbox event ${event.id} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private readPayload(event: OutboxEventEntity): EmailVerificationPayload {
    const email = event.payload.email;
    const code = event.payload.code;

    if (typeof email !== 'string' || typeof code !== 'string') {
      throw new Error('Invalid email verification outbox payload');
    }

    return { email, code };
  }
}
