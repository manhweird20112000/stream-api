import { StreamEvent } from '../../../domain/entities/stream-event';
import { StreamKey, StreamKeyStatus } from '../../../domain/entities/stream-key';
import {
  StreamSession,
  StreamSessionStatus,
} from '../../../domain/entities/stream-session';
import { StreamEventMapper } from './stream-event.mapper';
import { StreamKeyMapper } from './stream-key.mapper';
import { StreamSessionMapper } from './stream-session.mapper';

describe('stream persistence mappers', () => {
  it('maps stream keys both ways', () => {
    const createdAt = new Date('2026-09-26T00:00:00.000Z');
    const revokedAt = new Date('2026-09-26T00:01:00.000Z');
    const streamKey = StreamKey.rehydrate({
      id: 'key-1',
      ownerUserId: 'user-1',
      keyHash: 'hash',
      keyPrefix: 'prefix',
      status: StreamKeyStatus.INACTIVE,
      rotatedAt: null,
      revokedAt,
      createdAt,
    });

    const entity = StreamKeyMapper.toPersistence(streamKey);

    expect(entity).toMatchObject(streamKey.toPrimitives());
    expect(StreamKeyMapper.toDomain(entity)).toEqual(streamKey);
  });

  it('maps stream sessions both ways', () => {
    const createdAt = new Date('2026-09-26T00:00:00.000Z');
    const startedAt = new Date('2026-09-26T00:01:00.000Z');
    const session = StreamSession.rehydrate({
      id: 'session-1',
      streamId: 'stream-1',
      status: StreamSessionStatus.LIVE,
      publisherIp: '127.0.0.1',
      startedAt,
      endedAt: null,
      createdAt,
    });

    const entity = StreamSessionMapper.toPersistence(session);

    expect(entity).toMatchObject(session.toPrimitives());
    expect(StreamSessionMapper.toDomain(entity)).toEqual(session);
  });

  it('maps stream events both ways', () => {
    const event = StreamEvent.rehydrate({
      id: 'event-1',
      streamId: 'stream-1',
      sessionId: 'session-1',
      eventType: 'stream.started',
      eventData: { bitrate: 4500 },
      createdAt: new Date('2026-09-26T00:00:00.000Z'),
    });

    const entity = StreamEventMapper.toPersistence(event);

    expect(entity).toMatchObject(event.toPrimitives());
    expect(StreamEventMapper.toDomain(entity)).toEqual(event);
  });
});
