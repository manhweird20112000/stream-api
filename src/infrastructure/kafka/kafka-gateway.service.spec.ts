import { NEVER, of, Subject, throwError } from 'rxjs';
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
    jest.useRealTimers();
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

  afterEach(() => {
    jest.useRealTimers();
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
    await Promise.resolve();

    expect(client.connect).toHaveBeenCalled();
    expect(service.isReady()).toBe(false);
    await service.onModuleDestroy();
  });

  it('retries after a failed initial Kafka connect and becomes ready', async () => {
    jest.useFakeTimers();
    client.connect
      .mockRejectedValueOnce(new Error('broker down'))
      .mockResolvedValueOnce(undefined);
    const service = new KafkaGatewayService(client as never);

    service.onModuleInit();
    await Promise.resolve();
    await Promise.resolve();

    expect(service.isReady()).toBe(false);
    expect(client.close).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(5000);

    expect(client.connect).toHaveBeenCalledTimes(2);
    expect(service.isReady()).toBe(true);
    await service.onModuleDestroy();
  });

  it('does not mark itself ready from Kafka status before connect completes', async () => {
    client.connect.mockReturnValue(new Promise(() => undefined));
    const service = new KafkaGatewayService(client as never);

    service.onModuleInit();
    status.next('connected');

    expect(service.isReady()).toBe(false);
    await service.onModuleDestroy();
  });

  it('clears readiness from unavailable Kafka status changes', async () => {
    const service = new KafkaGatewayService(client as never);
    await service.onModuleInit();
    await Promise.resolve();

    expect(service.isReady()).toBe(true);

    status.next('disconnected');
    expect(service.isReady()).toBe(false);

    status.next('crashed');
    expect(service.isReady()).toBe(false);

    status.next('rebalancing');
    expect(service.isReady()).toBe(false);

    status.next('stopped');
    expect(service.isReady()).toBe(false);
    await service.onModuleDestroy();
  });

  it('reconnects after Kafka reports an unavailable status', async () => {
    jest.useFakeTimers();
    const service = new KafkaGatewayService(client as never);
    service.onModuleInit();
    await Promise.resolve();

    expect(service.isReady()).toBe(true);

    status.next('disconnected');
    expect(service.isReady()).toBe(false);

    await jest.advanceTimersByTimeAsync(5000);

    expect(client.close).toHaveBeenCalledTimes(1);
    expect(client.connect).toHaveBeenCalledTimes(2);
    expect(service.isReady()).toBe(true);
    await service.onModuleDestroy();
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
    client.send.mockReturnValue(NEVER);
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

  it('converts non-timeout transport errors into sanitized downstream errors', async () => {
    client.send.mockReturnValue(throwError(() => new Error('broker secret')));
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
    ).rejects.toEqual(
      new KafkaGatewayDownstreamError(
        'DOWNSTREAM_ERROR',
        'Downstream service error',
      ),
    );
  });
});
