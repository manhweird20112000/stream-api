import {
  Stream,
  StreamStatus,
  StreamVisibility,
} from '../../../domain/entities/stream';
import { StreamEntity } from '../entities/stream.entity';
import { StreamMapper } from './stream.mapper';

describe('StreamMapper', () => {
  it('maps stream domain and persistence shapes both ways', () => {
    const createdAt = new Date('2026-09-26T00:00:00.000Z');
    const updatedAt = new Date('2026-09-26T00:01:00.000Z');
    const stream = Stream.rehydrate({
      id: 'stream-1',
      ownerUserId: 'user-1',
      title: 'Launch stream',
      description: 'Demo',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      visibility: StreamVisibility.UNLISTED,
      status: StreamStatus.READY,
      playbackId: 'playback-1',
      streamKeyId: 'key-1',
      createdAt,
      updatedAt,
      startedAt: null,
      endedAt: null,
    });

    const entity = StreamMapper.toPersistence(stream);

    expect(entity).toBeInstanceOf(StreamEntity);
    expect(entity).toMatchObject({
      id: 'stream-1',
      ownerUserId: 'user-1',
      title: 'Launch stream',
      description: 'Demo',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      visibility: StreamVisibility.UNLISTED,
      status: StreamStatus.READY,
      playbackId: 'playback-1',
      streamKeyId: 'key-1',
      createdAt,
      updatedAt,
      startedAt: null,
      endedAt: null,
    });

    expect(StreamMapper.toDomain(entity)).toEqual(stream);
  });
});
