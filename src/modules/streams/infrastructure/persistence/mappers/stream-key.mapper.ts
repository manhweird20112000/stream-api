import { StreamKey } from '../../../domain/entities/stream-key';
import { StreamKeysEntity } from '../entities/stream-keys.entity';

export class StreamKeyMapper {
  static toDomain(entity: StreamKeysEntity): StreamKey {
    return StreamKey.rehydrate({
      id: entity.id,
      ownerUserId: entity.ownerUserId,
      keyHash: entity.keyHash,
      keyPrefix: entity.keyPrefix,
      status: entity.status,
      rotatedAt: entity.rotatedAt,
      revokedAt: entity.revokedAt,
      createdAt: entity.createdAt,
    });
  }

  static toPersistence(streamKey: StreamKey): StreamKeysEntity {
    const props = streamKey.toPrimitives();
    const entity = new StreamKeysEntity();

    entity.id = props.id;
    entity.ownerUserId = props.ownerUserId;
    entity.keyHash = props.keyHash;
    entity.keyPrefix = props.keyPrefix;
    entity.status = props.status;
    entity.rotatedAt = props.rotatedAt;
    entity.revokedAt = props.revokedAt;
    entity.createdAt = props.createdAt;

    return entity;
  }
}
