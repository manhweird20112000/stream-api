import type { Stream, StreamStatus } from '../entities/stream';

export const STREAM_REPOSITORY = Symbol('STREAM_REPOSITORY');

export interface FindStreamsCursor {
  createdAt: Date;
  id: string;
}

export interface FindStreamsOptions {
  status?: StreamStatus;
  limit?: number;
  offset?: number;
  cursor?: FindStreamsCursor;
}

export interface StreamRepository {
  save(stream: Stream): Promise<Stream>;
  findById(id: string): Promise<Stream | null>;
  findByOwnerUserId(
    ownerUserId: string,
    options?: FindStreamsOptions,
  ): Promise<Stream[]>;
  findPublicLive(options?: FindStreamsOptions): Promise<Stream[]>;
  delete(id: string): Promise<void>;
}
