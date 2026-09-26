import { EmailMessage, EmailSender } from '../../domain/ports/email-sender';
import { OutboxEventStatus } from '../persistence/entities/outbox-event.entity';
import { EmailOutboxProcessor } from './email-outbox.processor';

class FakeEmailSender implements EmailSender {
  readonly messages: EmailMessage[] = [];
  error: Error | null = null;

  send(message: EmailMessage): Promise<void> {
    if (this.error) {
      return Promise.reject(this.error);
    }

    this.messages.push(message);
    return Promise.resolve();
  }
}

describe('EmailOutboxProcessor', () => {
  function createProcessor(events: Array<Record<string, unknown>>) {
    const repository = {
      find: jest.fn().mockResolvedValue(events),
      save: jest.fn(async (event) => event),
    };
    const dataSource = {
      getRepository: jest.fn(() => repository),
    };
    const emails = new FakeEmailSender();
    const processor = new EmailOutboxProcessor(dataSource as never, emails, {
      EMAIL_DELIVERY_ENABLED: true,
    } as never);

    return { processor, emails, repository };
  }

  it('leaves events pending when email delivery is disabled', async () => {
    const event = {
      id: 'event-1',
      type: 'auth.email_verification_requested',
      status: OutboxEventStatus.Pending,
      payload: {
        email: 'owner@example.com',
        code: '123456',
      },
      processedAt: null,
      createdAt: new Date('2030-01-01T00:00:00.000Z'),
    };
    const repository = {
      find: jest.fn().mockResolvedValue([event]),
      save: jest.fn(async (saved) => saved),
    };
    const dataSource = {
      getRepository: jest.fn(() => repository),
    };
    const emails = new FakeEmailSender();
    const processor = new EmailOutboxProcessor(dataSource as never, emails, {
      EMAIL_DELIVERY_ENABLED: false,
    } as never);

    await processor.processPending();

    expect(emails.messages).toEqual([]);
    expect(dataSource.getRepository).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
    expect(event.status).toBe(OutboxEventStatus.Pending);
  });

  it('sends pending email verification events and marks them processed', async () => {
    const event = {
      id: 'event-1',
      type: 'auth.email_verification_requested',
      status: OutboxEventStatus.Pending,
      payload: {
        email: 'owner@example.com',
        code: '123456',
      },
      processedAt: null,
      createdAt: new Date('2030-01-01T00:00:00.000Z'),
    };
    const { processor, emails, repository } = createProcessor([event]);

    await processor.processPending();

    expect(emails.messages).toEqual([
      {
        to: 'owner@example.com',
        subject: 'Verify your Stream account',
        text: [
          'Use this code to verify your Stream account:',
          '',
          '123456',
          '',
          'This code expires soon.',
        ].join('\n'),
      },
    ]);
    expect(event.status).toBe(OutboxEventStatus.Processed);
    expect(event.processedAt).toBeInstanceOf(Date);
    expect(repository.save).toHaveBeenCalledWith(event);
  });

  it('keeps failed email verification events pending for retry', async () => {
    const event = {
      id: 'event-1',
      type: 'auth.email_verification_requested',
      status: OutboxEventStatus.Pending,
      payload: {
        email: 'owner@example.com',
        code: '123456',
      },
      processedAt: null,
      createdAt: new Date('2030-01-01T00:00:00.000Z'),
    };
    const { processor, emails, repository } = createProcessor([event]);
    emails.error = new Error('SMTP unavailable');

    await processor.processPending();

    expect(event.status).toBe(OutboxEventStatus.Pending);
    expect(event.processedAt).toBeNull();
    expect(repository.save).not.toHaveBeenCalled();
  });
});
