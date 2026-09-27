import type { StreamKey } from '../entities/stream-key';

export const STREAM_KEY_REPOSITORY = Symbol('STREAM_KEY_REPOSITORY');

export interface StreamKeyRepository {
  save(streamKey: StreamKey): Promise<StreamKey>;
  findById(id: string): Promise<StreamKey | null>;
  findActiveByOwnerUserId(ownerUserId: string): Promise<StreamKey | null>;
  findActiveByKeyHash(keyHash: string): Promise<StreamKey | null>;
}
