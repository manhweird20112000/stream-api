import { StreamSession } from '../../../domain/entities/stream-session';
import { StreamSessionEntity } from '../entities/stream-session.entity';

export class StreamSessionMapper {
  static toDomain(entity: StreamSessionEntity): StreamSession {
    return StreamSession.rehydrate({
      id: entity.id,
      streamId: entity.streamId,
      status: entity.status,
      publisherIp: entity.publisherIp,
      startedAt: entity.startedAt,
      endedAt: entity.endedAt,
      createdAt: entity.createdAt,
    });
  }

  static toPersistence(session: StreamSession): StreamSessionEntity {
    const props = session.toPrimitives();
    const entity = new StreamSessionEntity();

    entity.id = props.id;
    entity.streamId = props.streamId;
    entity.status = props.status;
    entity.publisherIp = props.publisherIp;
    entity.startedAt = props.startedAt;
    entity.endedAt = props.endedAt;
    entity.createdAt = props.createdAt;

    return entity;
  }
}
