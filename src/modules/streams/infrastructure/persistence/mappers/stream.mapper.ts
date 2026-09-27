import { Stream } from '../../../domain/entities/stream';
import { StreamEntity } from '../entities/stream.entity';

export class StreamMapper {
  static toDomain(entity: StreamEntity): Stream {
    return Stream.rehydrate({
      id: entity.id,
      ownerUserId: entity.ownerUserId,
      title: entity.title,
      description: entity.description,
      thumbnailUrl: entity.thumbnailUrl,
      visibility: entity.visibility,
      status: entity.status,
      playbackId: entity.playbackId,
      streamKeyId: entity.streamKeyId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      startedAt: entity.startedAt,
      endedAt: entity.endedAt,
    });
  }

  static toPersistence(stream: Stream): StreamEntity {
    const props = stream.toPrimitives();
    const entity = new StreamEntity();

    entity.id = props.id;
    entity.ownerUserId = props.ownerUserId;
    entity.title = props.title;
    entity.description = props.description;
    entity.thumbnailUrl = props.thumbnailUrl;
    entity.visibility = props.visibility;
    entity.status = props.status;
    entity.playbackId = props.playbackId;
    entity.streamKeyId = props.streamKeyId;
    entity.createdAt = props.createdAt;
    entity.updatedAt = props.updatedAt;
    entity.startedAt = props.startedAt;
    entity.endedAt = props.endedAt;

    return entity;
  }
}
