import { of, Subject, throwError } from 'rxjs';
import {
  KafkaGatewayDownstreamError,
  KafkaGatewayTimeoutError,
} from './kafka.errors';
import { KafkaGatewayService } from './kafka-gateway.service';

describe('KafkaGatewayService', () => {
  let status: Subject<string>;
  let client: {
    status: Subject<string>;
    subscribeToResponseOf: jest.Mock;
    connect: jest.Mock;
    close: jest.Mock;
    send: jest.Mock;
  };

  beforeEach(() => {
    status = new Subject<string>();
    client = {
      status,
      subscribeToResponseOf: jest.fn(),
      connect: jest.fn(),
      close: jest.fn(),
      send: jest.fn(),
    };
    client.connect.mockResolvedValue(undefined);
    client.close.mockResolvedValue(undefined);
  });

  it('subscribes to stream command replies and marks itself ready after connect', async () => {
    const service = new KafkaGatewayService(client as never);

    await service.onModuleInit();
    await Promise.resolve();

    expect(client.subscribeToResponseOf).toHaveBeenCalledWith(
      'stream.commands',
    );
    expect(client.connect).toHaveBeenCalled();
    expect(service.isReady()).toBe(true);
  });

  it('does not block startup when Kafka connect fails', async () => {
    client.connect.mockRejectedValue(new Error('broker down'));
    const service = new KafkaGatewayService(client as never);

    await expect(
      Promise.resolve(service.onModuleInit()),
    ).resolves.toBeUndefined();
    await Promise.resolve();

    expect(client.connect).toHaveBeenCalled();
    expect(service.isReady()).toBe(false);
  });

  it('updates readiness from Kafka status changes', async () => {
    const service = new KafkaGatewayService(client as never);
    await service.onModuleInit();

    status.next('connected');
    expect(service.isReady()).toBe(true);

    status.next('disconnected');
    expect(service.isReady()).toBe(false);

    status.next('crashed');
    expect(service.isReady()).toBe(false);
  });

  it('marks itself not ready after destroy', async () => {
    const service = new KafkaGatewayService(client as never);
    await service.onModuleInit();

    await service.onModuleDestroy();

    expect(client.close).toHaveBeenCalled();
    expect(service.isReady()).toBe(false);
  });

  it('returns data from an ok reply', async () => {
    client.send.mockReturnValue(
      of({ ok: true, data: { streamId: 'stream-1', status: 'created' } }),
    );
    const service = new KafkaGatewayService(client as never);

    await expect(
      service.request('stream.commands', {
        requestId: 'req-1',
        userId: 'user-1',
        type: 'stream.create',
        payload: { title: 'Demo' },
      }),
    ).resolves.toEqual({ streamId: 'stream-1', status: 'created' });
  });

  it('normalizes downstream error replies', async () => {
    client.send.mockReturnValue(
      of({
        ok: false,
        error: { code: 'STREAM_LIMIT_REACHED', message: 'Limit reached' },
      }),
    );
    const service = new KafkaGatewayService(client as never);

    await expect(
      service.request('stream.commands', {
        requestId: 'req-1',
        userId: 'user-1',
        type: 'stream.create',
        payload: { title: 'Demo' },
      }),
    ).rejects.toEqual(
      new KafkaGatewayDownstreamError('STREAM_LIMIT_REACHED', 'Limit reached'),
    );
  });

  it('converts transport timeouts into a gateway timeout error', async () => {
    client.send.mockReturnValue(
      throwError(() => new Error('Timeout has occurred')),
    );
    const service = new KafkaGatewayService(client as never);

    await expect(
      service.request(
        'stream.commands',
        {
          requestId: 'req-1',
          userId: 'user-1',
          type: 'stream.create',
          payload: { title: 'Demo' },
        },
        1,
      ),
    ).rejects.toBeInstanceOf(KafkaGatewayTimeoutError);
  });
});
