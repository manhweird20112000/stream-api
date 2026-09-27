import { Injectable } from '@nestjs/common';
import type { Stream } from '../../../domain/entities/stream';
import type {
  FindStreamsOptions,
  StreamRepository,
} from '../../../domain/repositories/stream.repository';

@Injectable()
export class InMemoryStreamRepository implements StreamRepository {
  private readonly streams = new Map<string, Stream>();

  async save(stream: Stream): Promise<Stream> {
    this.streams.set(stream.id, stream);
    return stream;
  }

  async findById(id: string): Promise<Stream | null> {
    return this.streams.get(id) ?? null;
  }

  async findByOwnerUserId(
    ownerUserId: string,
    options: FindStreamsOptions = {},
  ): Promise<Stream[]> {
    const offset = options.offset ?? 0;
    const limit = options.limit ?? Number.POSITIVE_INFINITY;

    return [...this.streams.values()]
      .filter((stream) => stream.ownerUserId === ownerUserId)
      .filter((stream) => !options.status || stream.status === options.status)
      .slice(offset, offset + limit);
  }

  async delete(id: string): Promise<void> {
    this.streams.delete(id);
  }
}
