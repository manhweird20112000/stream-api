import { StreamVisibility } from '../../domain/entities/stream';
import { StreamsController } from './streams.controller';

describe('StreamsController', () => {
  const makeController = (overrides: Record<string, unknown> = {}) => {
    const useCases = {
      createStream: { execute: jest.fn() },
      createStreamKey: { execute: jest.fn() },
      verifyStreamKey: { execute: jest.fn() },
      listStreams: { execute: jest.fn() },
      listPublicLiveStreams: { execute: jest.fn() },
      getStream: { execute: jest.fn() },
      updateStream: { execute: jest.fn() },
      publishStream: { execute: jest.fn() },
      endStream: { execute: jest.fn() },
      deleteStream: { execute: jest.fn() },
      ...overrides,
    };

    return {
      useCases,
      controller: new StreamsController(
        useCases.createStream as never,
        useCases.createStreamKey as never,
        useCases.verifyStreamKey as never,
        useCases.listStreams as never,
        useCases.listPublicLiveStreams as never,
        useCases.getStream as never,
        useCases.updateStream as never,
        useCases.publishStream as never,
        useCases.endStream as never,
        useCases.deleteStream as never,
      ),
    };
  };

  it('passes the authenticated user to the use case', async () => {
    const createStream = {
      execute: jest.fn().mockResolvedValue({
        id: 'stream-1',
        ownerUserId: 'user-1',
        title: 'Launch stream',
        description: 'Demo',
        thumbnailUrl: 'https://cdn.example.com/streams/launch.jpg',
        visibility: StreamVisibility.PUBLIC,
        status: 'CREATED',
        createdAt: new Date('2026-09-26T00:00:00.000Z'),
        updatedAt: new Date('2026-09-26T00:00:00.000Z'),
      }),
    };
    const { controller } = makeController({ createStream });

    await expect(
      controller.create(
        {
          title: 'Launch stream',
          description: 'Demo',
          thumbnailUrl: 'https://cdn.example.com/streams/launch.jpg',
          visibility: StreamVisibility.PUBLIC,
        },
        {
          user: { sub: 'user-1' },
        } as never,
      ),
    ).resolves.toEqual({
      id: 'stream-1',
      title: 'Launch stream',
      description: 'Demo',
      thumbnailUrl: 'https://cdn.example.com/streams/launch.jpg',
      visibility: StreamVisibility.PUBLIC,
      status: 'CREATED',
      createdAt: new Date('2026-09-26T00:00:00.000Z'),
      updatedAt: new Date('2026-09-26T00:00:00.000Z'),
    });

    expect(createStream.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      title: 'Launch stream',
      description: 'Demo',
      thumbnailUrl: 'https://cdn.example.com/streams/launch.jpg',
      visibility: StreamVisibility.PUBLIC,
    });
  });

  it('generates a stream key for the authenticated user', async () => {
    const createStreamKey = {
      execute: jest.fn().mockResolvedValue({ success: true }),
    };
    const { controller } = makeController({ createStreamKey });

    await expect(
      controller.generateKey({ user: { sub: 'user-1' } } as never),
    ).resolves.toEqual({ success: true });
    expect(createStreamKey.execute).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
    });
  });

  it('refreshes a stream key for the authenticated user', async () => {
    const createStreamKey = {
      execute: jest.fn().mockResolvedValue({ success: true }),
    };
    const { controller } = makeController({ createStreamKey });

    await expect(
      controller.refreshKey({ user: { sub: 'user-1' } } as never),
    ).resolves.toEqual({ success: true });
    expect(createStreamKey.execute).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      refresh: true,
    });
  });

  it('verifies a stream key without requiring the authenticated user', async () => {
    const verifyStreamKey = {
      execute: jest.fn().mockResolvedValue({
        valid: true,
        ownerUserId: 'user-1',
        streamKeyId: 'key-1',
      }),
    };
    const { controller } = makeController({ verifyStreamKey });

    await expect(
      controller.verifyKey({ streamKey: 'sk_valid-stream-key' }),
    ).resolves.toEqual({
      valid: true,
      ownerUserId: 'user-1',
      streamKeyId: 'key-1',
    });
    expect(verifyStreamKey.execute).toHaveBeenCalledWith({
      streamKey: 'sk_valid-stream-key',
    });
  });

  it('lists streams for the authenticated user', async () => {
    const now = new Date('2026-09-26T00:00:00.000Z');
    const listStreams = {
      execute: jest.fn().mockResolvedValue([
        {
          id: 'stream-1',
          title: 'Launch stream',
          description: 'Demo',
          thumbnailUrl: null,
          visibility: StreamVisibility.PRIVATE,
          status: 'CREATED',
          createdAt: now,
          updatedAt: now,
        },
      ]),
    };
    const { controller } = makeController({ listStreams });

    await expect(
      controller.list({}, { user: { sub: 'user-1' } } as never),
    ).resolves.toEqual({
      items: [
        {
          id: 'stream-1',
          title: 'Launch stream',
          description: 'Demo',
          thumbnailUrl: null,
          visibility: StreamVisibility.PRIVATE,
          status: 'CREATED',
          createdAt: now,
          updatedAt: now,
        },
      ],
      meta: {
        limit: 20,
        hasNextPage: false,
        nextCursor: null,
      },
    });
    expect(listStreams.execute).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      limit: 21,
      cursor: undefined,
    });
  });

  it('lists public live streams without requiring authentication', async () => {
    const now = new Date('2026-09-26T00:00:00.000Z');
    const listPublicLiveStreams = {
      execute: jest.fn().mockResolvedValue([
        {
          id: 'stream-1',
          title: 'Launch stream',
          description: 'Demo',
          thumbnailUrl: null,
          visibility: StreamVisibility.PUBLIC,
          status: 'LIVE',
          createdAt: now,
          updatedAt: now,
        },
      ]),
    };
    const { controller } = makeController({ listPublicLiveStreams });

    await expect(controller.listLive({})).resolves.toEqual({
      items: [
        {
          id: 'stream-1',
          title: 'Launch stream',
          description: 'Demo',
          thumbnailUrl: null,
          visibility: StreamVisibility.PUBLIC,
          status: 'LIVE',
          createdAt: now,
          updatedAt: now,
        },
      ],
      meta: {
        limit: 20,
        hasNextPage: false,
        nextCursor: null,
      },
    });
    expect(listPublicLiveStreams.execute).toHaveBeenCalledWith({
      limit: 21,
      cursor: undefined,
    });
  });

  it('gets a stream by id for the authenticated user', async () => {
    const now = new Date('2026-09-26T00:00:00.000Z');
    const getStream = {
      execute: jest.fn().mockResolvedValue({
        id: 'stream-1',
        title: 'Launch stream',
        description: 'Demo',
        thumbnailUrl: null,
        visibility: StreamVisibility.PRIVATE,
        status: 'CREATED',
        createdAt: now,
        updatedAt: now,
      }),
    };
    const { controller } = makeController({ getStream });

    await expect(
      controller.get('stream-1', { user: { sub: 'user-1' } } as never),
    ).resolves.toEqual({
      id: 'stream-1',
      title: 'Launch stream',
      description: 'Demo',
      thumbnailUrl: null,
      visibility: StreamVisibility.PRIVATE,
      status: 'CREATED',
      createdAt: now,
      updatedAt: now,
    });
    expect(getStream.execute).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      streamId: 'stream-1',
    });
  });

  it('updates a stream by id for the authenticated user', async () => {
    const now = new Date('2026-09-26T00:00:00.000Z');
    const updateStream = {
      execute: jest.fn().mockResolvedValue({
        id: 'stream-1',
        title: 'Updated stream',
        description: null,
        thumbnailUrl: 'https://cdn.example.com/streams/updated.jpg',
        visibility: StreamVisibility.PUBLIC,
        status: 'CREATED',
        createdAt: now,
        updatedAt: now,
      }),
    };
    const { controller } = makeController({ updateStream });

    await expect(
      controller.update(
        'stream-1',
        {
          title: 'Updated stream',
          description: null,
          thumbnailUrl: 'https://cdn.example.com/streams/updated.jpg',
          visibility: StreamVisibility.PUBLIC,
        },
        { user: { sub: 'user-1' } } as never,
      ),
    ).resolves.toEqual({
      id: 'stream-1',
      title: 'Updated stream',
      description: null,
      thumbnailUrl: 'https://cdn.example.com/streams/updated.jpg',
      visibility: StreamVisibility.PUBLIC,
      status: 'CREATED',
      createdAt: now,
      updatedAt: now,
    });
    expect(updateStream.execute).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      streamId: 'stream-1',
      title: 'Updated stream',
      description: null,
      thumbnailUrl: 'https://cdn.example.com/streams/updated.jpg',
      visibility: StreamVisibility.PUBLIC,
    });
  });

  it('publishes a stream by id for the authenticated user', async () => {
    const now = new Date('2026-09-26T00:00:00.000Z');
    const publishStream = {
      execute: jest.fn().mockResolvedValue({
        id: 'stream-1',
        title: 'Launch stream',
        description: 'Demo',
        thumbnailUrl: null,
        visibility: StreamVisibility.PRIVATE,
        status: 'LIVE',
        createdAt: now,
        updatedAt: now,
      }),
    };
    const { controller } = makeController({ publishStream });

    await expect(
      controller.publish(
        'stream-1',
        { publisherIp: '127.0.0.1' },
        { user: { sub: 'user-1' } } as never,
      ),
    ).resolves.toEqual({
      id: 'stream-1',
      title: 'Launch stream',
      description: 'Demo',
      thumbnailUrl: null,
      visibility: StreamVisibility.PRIVATE,
      status: 'LIVE',
      createdAt: now,
      updatedAt: now,
    });
    expect(publishStream.execute).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      streamId: 'stream-1',
      publisherIp: '127.0.0.1',
    });
  });

  it('ends a stream by id for the authenticated user', async () => {
    const now = new Date('2026-09-26T00:00:00.000Z');
    const endStream = {
      execute: jest.fn().mockResolvedValue({
        id: 'stream-1',
        title: 'Launch stream',
        description: 'Demo',
        thumbnailUrl: null,
        visibility: StreamVisibility.PRIVATE,
        status: 'ENDED',
        createdAt: now,
        updatedAt: now,
      }),
    };
    const { controller } = makeController({ endStream });

    await expect(
      controller.end('stream-1', { user: { sub: 'user-1' } } as never),
    ).resolves.toEqual({
      id: 'stream-1',
      title: 'Launch stream',
      description: 'Demo',
      thumbnailUrl: null,
      visibility: StreamVisibility.PRIVATE,
      status: 'ENDED',
      createdAt: now,
      updatedAt: now,
    });
    expect(endStream.execute).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      streamId: 'stream-1',
    });
  });

  it('deletes a stream by id for the authenticated user', async () => {
    const deleteStream = { execute: jest.fn().mockResolvedValue(undefined) };
    const { controller } = makeController({ deleteStream });

    await expect(
      controller.delete('stream-1', { user: { sub: 'user-1' } } as never),
    ).resolves.toBeUndefined();
    expect(deleteStream.execute).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      streamId: 'stream-1',
    });
  });
});
