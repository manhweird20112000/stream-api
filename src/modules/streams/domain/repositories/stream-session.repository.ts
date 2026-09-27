import type { StreamSession } from '../entities/stream-session';

export const STREAM_SESSION_REPOSITORY = Symbol('STREAM_SESSION_REPOSITORY');

export interface StreamSessionRepository {
  save(session: StreamSession): Promise<StreamSession>;
  findById(id: string): Promise<StreamSession | null>;
  findByStreamId(streamId: string): Promise<StreamSession[]>;
}
