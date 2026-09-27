import { Injectable } from '@nestjs/common';
import type { StreamSession } from '../../../domain/entities/stream-session';
import type { StreamSessionRepository } from '../../../domain/repositories/stream-session.repository';

@Injectable()
export class InMemoryStreamSessionRepository implements StreamSessionRepository {
  private readonly sessions = new Map<string, StreamSession>();

  async save(session: StreamSession): Promise<StreamSession> {
    this.sessions.set(session.id, session);
    return session;
  }

  async findById(id: string): Promise<StreamSession | null> {
    return this.sessions.get(id) ?? null;
  }

  async findByStreamId(streamId: string): Promise<StreamSession[]> {
    return [...this.sessions.values()].filter(
      (session) => session.streamId === streamId,
    );
  }
}
