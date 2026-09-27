import { createHash, randomBytes } from 'node:crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Stream,
  StreamStatus,
  type StreamVisibility,
} from '../../domain/entities/stream';
import { StreamEvent } from '../../domain/entities/stream-event';
import { StreamKey } from '../../domain/entities/stream-key';
import {
  StreamSession,
  StreamSessionStatus,
} from '../../domain/entities/stream-session';
import {
  STREAM_EVENT_REPOSITORY,
  type StreamEventRepository,
} from '../../domain/repositories/stream-event.repository';
import {
  STREAM_KEY_REPOSITORY,
  type StreamKeyRepository,
} from '../../domain/repositories/stream-key.repository';
import {
  STREAM_SESSION_REPOSITORY,
  type StreamSessionRepository,
} from '../../domain/repositories/stream-session.repository';
import {
  type FindStreamsCursor,
  STREAM_REPOSITORY,
  type StreamRepository,
} from '../../domain/repositories/stream.repository';

interface OwnedStreamInput {
  ownerUserId: string;
  streamId: string;
}

export interface ListStreamsInput {
  ownerUserId: string;
  limit?: number;
  cursor?: FindStreamsCursor;
}

export interface ListPublicLiveStreamsInput {
  limit?: number;
  cursor?: FindStreamsCursor;
}

export interface UpdateStreamInput extends OwnedStreamInput {
  title?: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  visibility?: StreamVisibility;
}

export interface PublishStreamInput extends OwnedStreamInput {
  publisherIp?: string | null;
}

async function findOwnedStream(
  streamRepository: StreamRepository,
  input: OwnedStreamInput,
): Promise<Stream> {
  const stream = await streamRepository.findById(input.streamId);

  if (!stream || stream.ownerUserId !== input.ownerUserId) {
    throw new NotFoundException('Stream not found');
  }

  return stream;
}

function createStreamKey(ownerUserId: string): StreamKey {
  const plainKey = `sk_${randomBytes(32).toString('base64url')}`;

  return StreamKey.create({
    ownerUserId,
    keyHash: createHash('sha256').update(plainKey).digest('hex'),
    keyPrefix: plainKey.slice(0, 12),
  });
}

@Injectable()
export class ListStreamsUseCase {
  constructor(
    @Inject(STREAM_REPOSITORY)
    private readonly streamRepository: StreamRepository,
  ) {}

  execute(input: ListStreamsInput): Promise<Stream[]> {
    return this.streamRepository.findByOwnerUserId(input.ownerUserId, {
      limit: input.limit,
      cursor: input.cursor,
    });
  }
}

@Injectable()
export class ListPublicLiveStreamsUseCase {
  constructor(
    @Inject(STREAM_REPOSITORY)
    private readonly streamRepository: StreamRepository,
  ) {}

  execute(input: ListPublicLiveStreamsInput): Promise<Stream[]> {
    return this.streamRepository.findPublicLive({
      limit: input.limit,
      cursor: input.cursor,
    });
  }
}

@Injectable()
export class GetStreamUseCase {
  constructor(
    @Inject(STREAM_REPOSITORY)
    private readonly streamRepository: StreamRepository,
  ) {}

  execute(input: OwnedStreamInput): Promise<Stream> {
    return findOwnedStream(this.streamRepository, input);
  }
}

@Injectable()
export class UpdateStreamUseCase {
  constructor(
    @Inject(STREAM_REPOSITORY)
    private readonly streamRepository: StreamRepository,
  ) {}

  async execute(input: UpdateStreamInput): Promise<Stream> {
    const stream = await findOwnedStream(this.streamRepository, input);

    stream.updateMetadata({
      title: input.title,
      description: input.description,
      thumbnailUrl: input.thumbnailUrl,
      visibility: input.visibility,
    });

    return this.streamRepository.save(stream);
  }
}

@Injectable()
export class PublishStreamUseCase {
  constructor(
    @Inject(STREAM_REPOSITORY)
    private readonly streamRepository: StreamRepository,
    @Inject(STREAM_KEY_REPOSITORY)
    private readonly streamKeyRepository: StreamKeyRepository,
    @Inject(STREAM_SESSION_REPOSITORY)
    private readonly streamSessionRepository: StreamSessionRepository,
    @Inject(STREAM_EVENT_REPOSITORY)
    private readonly streamEventRepository: StreamEventRepository,
  ) {}

  async execute(input: PublishStreamInput): Promise<Stream> {
    const stream = await findOwnedStream(this.streamRepository, input);
    const liveStreams = await this.streamRepository.findByOwnerUserId(
      input.ownerUserId,
      { status: StreamStatus.LIVE },
    );

    if (liveStreams.some((liveStream) => liveStream.id !== stream.id)) {
      throw new ConflictException('Another stream is already live');
    }

    const activeKey =
      (await this.streamKeyRepository.findActiveByOwnerUserId(
        input.ownerUserId,
      )) ??
      (await this.streamKeyRepository.save(createStreamKey(input.ownerUserId)));
    const session = StreamSession.create({
      streamId: stream.id,
      publisherIp: input.publisherIp,
    });

    session.markLive();

    stream.assignStreamKey(activeKey.id);
    stream.start();

    const savedSession = await this.streamSessionRepository.save(session);
    await this.streamEventRepository.save(
      StreamEvent.record({
        streamId: stream.id,
        sessionId: savedSession.id,
        eventType: 'STREAM_PUBLISHED',
        eventData: { publisherIp: input.publisherIp ?? null },
      }),
    );

    return this.streamRepository.save(stream);
  }
}

@Injectable()
export class EndStreamUseCase {
  constructor(
    @Inject(STREAM_REPOSITORY)
    private readonly streamRepository: StreamRepository,
    @Inject(STREAM_SESSION_REPOSITORY)
    private readonly streamSessionRepository: StreamSessionRepository,
    @Inject(STREAM_EVENT_REPOSITORY)
    private readonly streamEventRepository: StreamEventRepository,
  ) {}

  async execute(input: OwnedStreamInput): Promise<Stream> {
    const stream = await findOwnedStream(this.streamRepository, input);
    const sessions = await this.streamSessionRepository.findByStreamId(
      input.streamId,
    );
    const liveSession = sessions.find(
      (session) => session.status === StreamSessionStatus.LIVE,
    );

    if (liveSession) {
      liveSession.disconnect();
      await this.streamSessionRepository.save(liveSession);
    }

    stream.end();

    await this.streamEventRepository.save(
      StreamEvent.record({
        streamId: stream.id,
        sessionId: liveSession?.id ?? null,
        eventType: 'STREAM_ENDED',
        eventData: {},
      }),
    );

    return this.streamRepository.save(stream);
  }
}

@Injectable()
export class DeleteStreamUseCase {
  constructor(
    @Inject(STREAM_REPOSITORY)
    private readonly streamRepository: StreamRepository,
  ) {}

  async execute(input: OwnedStreamInput): Promise<void> {
    await findOwnedStream(this.streamRepository, input);
    await this.streamRepository.delete(input.streamId);
  }
}
