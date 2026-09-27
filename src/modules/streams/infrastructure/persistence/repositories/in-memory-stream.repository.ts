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
      .sort((left, right) => {
        const createdAtDiff =
          right.createdAt.getTime() - left.createdAt.getTime();

        return createdAtDiff || right.id.localeCompare(left.id);
      })
      .filter((stream) => {
        if (!options.cursor) {
          return true;
        }

        return (
          stream.createdAt < options.cursor.createdAt ||
          (stream.createdAt.getTime() === options.cursor.createdAt.getTime() &&
            stream.id < options.cursor.id)
        );
      })
      .slice(offset, offset + limit);
  }

  async findPublicLive(options: FindStreamsOptions = {}): Promise<Stream[]> {
    const offset = options.offset ?? 0;
    const limit = options.limit ?? Number.POSITIVE_INFINITY;

    return [...this.streams.values()]
      .filter((stream) => stream.status === 'LIVE')
      .filter((stream) => stream.visibility === 'PUBLIC')
      .sort((left, right) => {
        const createdAtDiff =
          right.createdAt.getTime() - left.createdAt.getTime();

        return createdAtDiff || right.id.localeCompare(left.id);
      })
      .filter((stream) => {
        if (!options.cursor) {
          return true;
        }

        return (
          stream.createdAt < options.cursor.createdAt ||
          (stream.createdAt.getTime() === options.cursor.createdAt.getTime() &&
            stream.id < options.cursor.id)
        );
      })
      .slice(offset, offset + limit);
  }

  async delete(id: string): Promise<void> {
    this.streams.delete(id);
  }
}
