import { Injectable } from '@nestjs/common';
import type { StreamKey } from '../../../domain/entities/stream-key';
import { StreamKeyStatus } from '../../../domain/entities/stream-key';
import type { StreamKeyRepository } from '../../../domain/repositories/stream-key.repository';

@Injectable()
export class InMemoryStreamKeyRepository implements StreamKeyRepository {
  private readonly streamKeys = new Map<string, StreamKey>();

  async save(streamKey: StreamKey): Promise<StreamKey> {
    this.streamKeys.set(streamKey.id, streamKey);
    return streamKey;
  }

  async findById(id: string): Promise<StreamKey | null> {
    return this.streamKeys.get(id) ?? null;
  }

  async findActiveByOwnerUserId(ownerUserId: string): Promise<StreamKey | null> {
    return (
      [...this.streamKeys.values()].find(
        (streamKey) =>
          streamKey.ownerUserId === ownerUserId &&
          streamKey.status === StreamKeyStatus.ACTIVE,
      ) ?? null
    );
  }

  async findActiveByKeyHash(keyHash: string): Promise<StreamKey | null> {
    return (
      [...this.streamKeys.values()].find(
        (streamKey) =>
          streamKey.keyHash === keyHash &&
          streamKey.status === StreamKeyStatus.ACTIVE,
      ) ?? null
    );
  }
}
