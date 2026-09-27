import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  Stream,
  StreamStatus,
  StreamVisibility,
} from '../../domain/entities/stream';
import {
  StreamKey,
  StreamKeyStatus,
} from '../../domain/entities/stream-key';
import {
  StreamSession,
  StreamSessionStatus,
} from '../../domain/entities/stream-session';
import type { StreamEventRepository } from '../../domain/repositories/stream-event.repository';
import type { StreamKeyRepository } from '../../domain/repositories/stream-key.repository';
import type { StreamSessionRepository } from '../../domain/repositories/stream-session.repository';
import type { StreamRepository } from '../../domain/repositories/stream.repository';
import {
  DeleteStreamUseCase,
  EndStreamUseCase,
  GetStreamUseCase,
  ListStreamsUseCase,
  ListPublicLiveStreamsUseCase,
  PublishStreamUseCase,
  UpdateStreamUseCase,
} from './stream-crud.use-cases';

function makeStream(
  ownerUserId = 'user-1',
  id = 'stream-1',
  status = StreamStatus.CREATED,
): Stream {
  return Stream.rehydrate({
    id,
    ownerUserId,
    title: 'Launch stream',
    description: 'Demo',
    thumbnailUrl: null,
    visibility: StreamVisibility.PRIVATE,
    status,
    playbackId: null,
    streamKeyId: null,
    createdAt: new Date('2026-09-26T00:00:00.000Z'),
    updatedAt: new Date('2026-09-26T00:00:00.000Z'),
    startedAt: null,
    endedAt: null,
  });
}

function makeActiveKey(ownerUserId = 'user-1'): StreamKey {
  return StreamKey.rehydrate({
    id: 'key-1',
    ownerUserId,
    keyHash: 'hash',
    keyPrefix: 'sk_prefix',
    status: StreamKeyStatus.ACTIVE,
    rotatedAt: null,
    revokedAt: null,
    createdAt: new Date('2026-09-26T00:00:00.000Z'),
  });
}

function makeLiveSession(streamId = 'stream-1'): StreamSession {
  return StreamSession.rehydrate({
    id: 'session-1',
    streamId,
    status: StreamSessionStatus.LIVE,
    publisherIp: '127.0.0.1',
    startedAt: new Date('2026-09-26T00:01:00.000Z'),
    endedAt: null,
    createdAt: new Date('2026-09-26T00:01:00.000Z'),
  });
}

describe('stream CRUD use cases', () => {
  it('lists streams owned by the user', async () => {
    const stream = makeStream();
    const cursor = {
      createdAt: new Date('2026-09-26T00:00:00.000Z'),
      id: 'stream-cursor',
    };
    const repository: StreamRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByOwnerUserId: jest.fn(async () => [stream]),
      findPublicLive: jest.fn(),
      delete: jest.fn(),
    };

    await expect(
      new ListStreamsUseCase(repository).execute({
        ownerUserId: 'user-1',
        limit: 21,
        cursor,
      }),
    ).resolves.toEqual([stream]);
    expect(repository.findByOwnerUserId).toHaveBeenCalledWith('user-1', {
      limit: 21,
      cursor,
    });
  });

  it('lists public live streams with cursor pagination', async () => {
    const stream = makeStream('user-1', 'stream-1', StreamStatus.LIVE);
    stream.updateMetadata({ visibility: StreamVisibility.PUBLIC });
    const cursor = {
      createdAt: new Date('2026-09-26T00:00:00.000Z'),
      id: 'stream-cursor',
    };
    const repository: StreamRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByOwnerUserId: jest.fn(),
      findPublicLive: jest.fn(async () => [stream]),
      delete: jest.fn(),
    };

    await expect(
      new ListPublicLiveStreamsUseCase(repository).execute({
        limit: 21,
        cursor,
      }),
    ).resolves.toEqual([stream]);
    expect(repository.findPublicLive).toHaveBeenCalledWith({
      limit: 21,
      cursor,
    });
  });

  it('returns an owned stream by id', async () => {
    const stream = makeStream();
    const repository: StreamRepository = {
      save: jest.fn(),
      findById: jest.fn(async () => stream),
      findByOwnerUserId: jest.fn(),
      findPublicLive: jest.fn(),
      delete: jest.fn(),
    };

    await expect(
      new GetStreamUseCase(repository).execute({
        ownerUserId: 'user-1',
        streamId: 'stream-1',
      }),
    ).resolves.toBe(stream);
  });

  it('rejects streams owned by another user', async () => {
    const stream = makeStream('user-2');
    const repository: StreamRepository = {
      save: jest.fn(),
      findById: jest.fn(async () => stream),
      findByOwnerUserId: jest.fn(),
      findPublicLive: jest.fn(),
      delete: jest.fn(),
    };

    await expect(
      new GetStreamUseCase(repository).execute({
        ownerUserId: 'user-1',
        streamId: 'stream-1',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('updates owned stream metadata', async () => {
    const stream = makeStream();
    const repository: StreamRepository = {
      save: jest.fn(async (saved) => saved),
      findById: jest.fn(async () => stream),
      findByOwnerUserId: jest.fn(),
      findPublicLive: jest.fn(),
      delete: jest.fn(),
    };

    const result = await new UpdateStreamUseCase(repository).execute({
      ownerUserId: 'user-1',
      streamId: 'stream-1',
      title: 'Updated stream',
      description: null,
      visibility: StreamVisibility.PUBLIC,
    });

    expect(result.toPrimitives()).toMatchObject({
      title: 'Updated stream',
      description: null,
      visibility: StreamVisibility.PUBLIC,
    });
    expect(repository.save).toHaveBeenCalledWith(result);
  });

  it('deletes an owned stream', async () => {
    const stream = makeStream();
    const repository: StreamRepository = {
      save: jest.fn(),
      findById: jest.fn(async () => stream),
      findByOwnerUserId: jest.fn(),
      findPublicLive: jest.fn(),
      delete: jest.fn(async () => undefined),
    };

    await new DeleteStreamUseCase(repository).execute({
      ownerUserId: 'user-1',
      streamId: 'stream-1',
    });

    expect(repository.delete).toHaveBeenCalledWith('stream-1');
  });

  it('publishes a draft stream with session and event records', async () => {
    const stream = makeStream();
    const activeKey = makeActiveKey();
    const streamRepository: StreamRepository = {
      save: jest.fn(async (saved) => saved),
      findById: jest.fn(async () => stream),
      findByOwnerUserId: jest.fn(async () => []),
      findPublicLive: jest.fn(),
      delete: jest.fn(),
    };
    const streamKeyRepository: StreamKeyRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findActiveByOwnerUserId: jest.fn(async () => activeKey),
      findActiveByKeyHash: jest.fn(),
    };
    const streamSessionRepository: StreamSessionRepository = {
      save: jest.fn(async (session) => session),
      findById: jest.fn(),
      findByStreamId: jest.fn(),
    };
    const streamEventRepository: StreamEventRepository = {
      save: jest.fn(async (event) => event),
      findByStreamId: jest.fn(),
    };

    const result = await new PublishStreamUseCase(
      streamRepository,
      streamKeyRepository,
      streamSessionRepository,
      streamEventRepository,
    ).execute({
      ownerUserId: 'user-1',
      streamId: 'stream-1',
      publisherIp: '127.0.0.1',
    });

    expect(result.status).toBe(StreamStatus.LIVE);
    expect(result.streamKeyId).toBe('key-1');
    expect(streamKeyRepository.save).not.toHaveBeenCalled();
    expect(streamSessionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        streamId: 'stream-1',
        publisherIp: '127.0.0.1',
        status: StreamSessionStatus.LIVE,
      }),
    );
    expect(streamEventRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        streamId: 'stream-1',
        eventType: 'STREAM_PUBLISHED',
      }),
    );
    expect(streamRepository.save).toHaveBeenCalledWith(result);
  });

  it('creates a new key when publishing without an active key', async () => {
    const stream = makeStream();
    const savedKeys: StreamKey[] = [];
    const streamRepository: StreamRepository = {
      save: jest.fn(async (saved) => saved),
      findById: jest.fn(async () => stream),
      findByOwnerUserId: jest.fn(async () => []),
      findPublicLive: jest.fn(),
      delete: jest.fn(),
    };
    const streamKeyRepository: StreamKeyRepository = {
      save: jest.fn(async (streamKey) => {
        savedKeys.push(streamKey);
        return streamKey;
      }),
      findById: jest.fn(),
      findActiveByOwnerUserId: jest.fn(async () => null),
      findActiveByKeyHash: jest.fn(),
    };
    const streamSessionRepository: StreamSessionRepository = {
      save: jest.fn(async (session) => session),
      findById: jest.fn(),
      findByStreamId: jest.fn(),
    };
    const streamEventRepository: StreamEventRepository = {
      save: jest.fn(async (event) => event),
      findByStreamId: jest.fn(),
    };

    const result = await new PublishStreamUseCase(
      streamRepository,
      streamKeyRepository,
      streamSessionRepository,
      streamEventRepository,
    ).execute({
      ownerUserId: 'user-1',
      streamId: 'stream-1',
    });

    expect(savedKeys).toHaveLength(1);
    expect(savedKeys[0].status).toBe(StreamKeyStatus.ACTIVE);
    expect(result.status).toBe(StreamStatus.LIVE);
    expect(result.streamKeyId).toBe(savedKeys[0].id);
  });

  it('rejects publishing a second live stream for the same user', async () => {
    const stream = makeStream('user-1', 'stream-2');
    const liveStream = makeStream('user-1', 'stream-1', StreamStatus.LIVE);
    const streamRepository: StreamRepository = {
      save: jest.fn(),
      findById: jest.fn(async () => stream),
      findByOwnerUserId: jest.fn(async () => [liveStream]),
      findPublicLive: jest.fn(),
      delete: jest.fn(),
    };
    const streamKeyRepository: StreamKeyRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findActiveByOwnerUserId: jest.fn(),
      findActiveByKeyHash: jest.fn(),
    };
    const streamSessionRepository: StreamSessionRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByStreamId: jest.fn(),
    };
    const streamEventRepository: StreamEventRepository = {
      save: jest.fn(),
      findByStreamId: jest.fn(),
    };

    await expect(
      new PublishStreamUseCase(
        streamRepository,
        streamKeyRepository,
        streamSessionRepository,
        streamEventRepository,
      ).execute({
        ownerUserId: 'user-1',
        streamId: 'stream-2',
      }),
    ).rejects.toThrow(ConflictException);
    expect(streamRepository.save).not.toHaveBeenCalled();
  });

  it('ends a live stream and disconnects the live session', async () => {
    const stream = makeStream('user-1', 'stream-1', StreamStatus.LIVE);
    const liveSession = makeLiveSession();
    const streamRepository: StreamRepository = {
      save: jest.fn(async (saved) => saved),
      findById: jest.fn(async () => stream),
      findByOwnerUserId: jest.fn(),
      findPublicLive: jest.fn(),
      delete: jest.fn(),
    };
    const streamSessionRepository: StreamSessionRepository = {
      save: jest.fn(async (session) => session),
      findById: jest.fn(),
      findByStreamId: jest.fn(async () => [liveSession]),
    };
    const streamEventRepository: StreamEventRepository = {
      save: jest.fn(async (event) => event),
      findByStreamId: jest.fn(),
    };

    const result = await new EndStreamUseCase(
      streamRepository,
      streamSessionRepository,
      streamEventRepository,
    ).execute({
      ownerUserId: 'user-1',
      streamId: 'stream-1',
    });

    expect(result.status).toBe(StreamStatus.ENDED);
    expect(liveSession.status).toBe(StreamSessionStatus.DISCONNECTED);
    expect(streamSessionRepository.save).toHaveBeenCalledWith(liveSession);
    expect(streamEventRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        streamId: 'stream-1',
        sessionId: 'session-1',
        eventType: 'STREAM_ENDED',
      }),
    );
    expect(streamRepository.save).toHaveBeenCalledWith(result);
  });
});
