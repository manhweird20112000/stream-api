import { Inject, Injectable } from '@nestjs/common';
import { Stream } from '../../domain/entities/stream';
import {
  STREAM_REPOSITORY,
  type StreamRepository,
} from '../../domain/repositories/stream.repository';
import { CreateStreamInput } from '../dto/create-stream.input';

@Injectable()
export class CreateStreamUseCase {
  constructor(
    @Inject(STREAM_REPOSITORY)
    private readonly streamRepository: StreamRepository,
  ) {}

  async execute(input: CreateStreamInput): Promise<Stream> {
    const stream = Stream.create({
      ownerUserId: input.userId,
      title: input.title,
      description: input.description,
      thumbnailUrl: input.thumbnailUrl,
      visibility: input.visibility,
    });

    return this.streamRepository.save(stream);
  }
}
