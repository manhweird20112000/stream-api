import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  Stream,
  type StreamVisibility,
} from '../../domain/entities/stream';
import {
  STREAM_REPOSITORY,
  type StreamRepository,
} from '../../domain/repositories/stream.repository';

interface OwnedStreamInput {
  ownerUserId: string;
  streamId: string;
}

export interface ListStreamsInput {
  ownerUserId: string;
}

export interface UpdateStreamInput extends OwnedStreamInput {
  title?: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  visibility?: StreamVisibility;
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

@Injectable()
export class ListStreamsUseCase {
  constructor(
    @Inject(STREAM_REPOSITORY)
    private readonly streamRepository: StreamRepository,
  ) {}

  execute(input: ListStreamsInput): Promise<Stream[]> {
    return this.streamRepository.findByOwnerUserId(input.ownerUserId);
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
