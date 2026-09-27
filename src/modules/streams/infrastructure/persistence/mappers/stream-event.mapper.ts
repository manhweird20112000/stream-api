import { StreamEvent } from '../../../domain/entities/stream-event';
import { StreamEventEntity } from '../entities/stream-event.entity';

export class StreamEventMapper {
  static toDomain(entity: StreamEventEntity): StreamEvent {
    return StreamEvent.rehydrate({
      id: entity.id,
      streamId: entity.streamId,
      sessionId: entity.sessionId,
      eventType: entity.eventType,
      eventData: entity.eventData,
      createdAt: entity.createdAt,
    });
  }

  static toPersistence(event: StreamEvent): StreamEventEntity {
    const props = event.toPrimitives();
    const entity = new StreamEventEntity();

    entity.id = props.id;
    entity.streamId = props.streamId;
    entity.sessionId = props.sessionId;
    entity.eventType = props.eventType;
    entity.eventData = props.eventData;
    entity.createdAt = props.createdAt;

    return entity;
  }
}
