import {
  Stream,
  StreamStatus,
  StreamVisibility,
} from './stream';

describe('Stream', () => {
  it('creates a private stream in CREATED status', () => {
    const stream = Stream.create({
      ownerUserId: 'user-1',
      title: 'Launch stream',
      description: 'Demo',
    });

    expect(stream).toMatchObject({
      id: expect.any(String),
      ownerUserId: 'user-1',
      title: 'Launch stream',
      description: 'Demo',
      thumbnailUrl: null,
      visibility: StreamVisibility.PRIVATE,
      status: StreamStatus.CREATED,
      playbackId: null,
      streamKeyId: null,
      startedAt: null,
      endedAt: null,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });

  it('creates a stream with startup metadata', () => {
    const stream = Stream.create({
      ownerUserId: 'user-1',
      title: 'Launch stream',
      description: 'Demo',
      thumbnailUrl: 'https://cdn.example.com/streams/launch.jpg',
      visibility: StreamVisibility.PUBLIC,
    });

    expect(stream.thumbnailUrl).toBe(
      'https://cdn.example.com/streams/launch.jpg',
    );
    expect(stream.visibility).toBe(StreamVisibility.PUBLIC);
  });

  it('moves through ready live and ended states', () => {
    const createdAt = new Date('2026-09-26T00:00:00.000Z');
    const stream = Stream.rehydrate({
      id: 'stream-1',
      ownerUserId: 'user-1',
      title: 'Launch stream',
      description: null,
      thumbnailUrl: null,
      visibility: StreamVisibility.PRIVATE,
      status: StreamStatus.CREATED,
      playbackId: null,
      streamKeyId: null,
      createdAt,
      updatedAt: createdAt,
      startedAt: null,
      endedAt: null,
    });

    const readyAt = new Date('2026-09-26T00:01:00.000Z');
    stream.markReady({ playbackId: 'playback-1', at: readyAt });
    expect(stream.status).toBe(StreamStatus.READY);
    expect(stream.playbackId).toBe('playback-1');
    expect(stream.updatedAt).toBe(readyAt);

    const liveAt = new Date('2026-09-26T00:02:00.000Z');
    stream.start(liveAt);
    expect(stream.status).toBe(StreamStatus.LIVE);
    expect(stream.startedAt).toBe(liveAt);

    const endedAt = new Date('2026-09-26T00:03:00.000Z');
    stream.end(endedAt);
    expect(stream.status).toBe(StreamStatus.ENDED);
    expect(stream.endedAt).toBe(endedAt);
  });
});
