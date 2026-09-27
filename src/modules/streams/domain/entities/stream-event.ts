import { randomUUID } from 'node:crypto';

export interface StreamEventProps {
  id: string;
  streamId: string;
  sessionId: string | null;
  eventType: string;
  eventData: unknown;
  createdAt: Date;
}

export interface RecordStreamEventProps {
  streamId: string;
  sessionId?: string | null;
  eventType: string;
  eventData: unknown;
}

export class StreamEvent {
  private constructor(private readonly props: StreamEventProps) {}

  static record(input: RecordStreamEventProps): StreamEvent {
    return new StreamEvent({
      id: randomUUID(),
      streamId: input.streamId,
      sessionId: input.sessionId ?? null,
      eventType: input.eventType,
      eventData: input.eventData,
      createdAt: new Date(),
    });
  }

  static rehydrate(props: StreamEventProps): StreamEvent {
    return new StreamEvent({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get streamId(): string {
    return this.props.streamId;
  }

  get sessionId(): string | null {
    return this.props.sessionId;
  }

  get eventType(): string {
    return this.props.eventType;
  }

  get eventData(): unknown {
    return this.props.eventData;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toPrimitives(): StreamEventProps {
    return { ...this.props };
  }
}
