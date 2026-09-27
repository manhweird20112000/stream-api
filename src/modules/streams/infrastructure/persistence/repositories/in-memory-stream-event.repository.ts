import { Injectable } from '@nestjs/common';
import type { StreamEvent } from '../../../domain/entities/stream-event';
import type { StreamEventRepository } from '../../../domain/repositories/stream-event.repository';

@Injectable()
export class InMemoryStreamEventRepository implements StreamEventRepository {
  private readonly events = new Map<string, StreamEvent>();

  async save(event: StreamEvent): Promise<StreamEvent> {
    this.events.set(event.id, event);
    return event;
  }

  async findByStreamId(streamId: string): Promise<StreamEvent[]> {
    return [...this.events.values()].filter((event) => event.streamId === streamId);
  }
}
