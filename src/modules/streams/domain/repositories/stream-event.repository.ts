import type { StreamEvent } from '../entities/stream-event';

export const STREAM_EVENT_REPOSITORY = Symbol('STREAM_EVENT_REPOSITORY');

export interface StreamEventRepository {
  save(event: StreamEvent): Promise<StreamEvent>;
  findByStreamId(streamId: string): Promise<StreamEvent[]>;
}
