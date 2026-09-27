import { randomUUID } from 'node:crypto';

export enum StreamSessionStatus {
  CONNECTING = 'CONNECTING',
  LIVE = 'LIVE',
  DISCONNECTED = 'DISCONNECTED',
  FAILED = 'FAILED',
}

export interface StreamSessionProps {
  id: string;
  streamId: string;
  status: StreamSessionStatus;
  publisherIp: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
}

export interface CreateStreamSessionProps {
  streamId: string;
  publisherIp?: string | null;
}

export class StreamSession {
  private constructor(private props: StreamSessionProps) {}

  static create(input: CreateStreamSessionProps): StreamSession {
    return new StreamSession({
      id: randomUUID(),
      streamId: input.streamId,
      status: StreamSessionStatus.CONNECTING,
      publisherIp: input.publisherIp ?? null,
      startedAt: null,
      endedAt: null,
      createdAt: new Date(),
    });
  }

  static rehydrate(props: StreamSessionProps): StreamSession {
    return new StreamSession({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get streamId(): string {
    return this.props.streamId;
  }

  get status(): StreamSessionStatus {
    return this.props.status;
  }

  get publisherIp(): string | null {
    return this.props.publisherIp;
  }

  get startedAt(): Date | null {
    return this.props.startedAt;
  }

  get endedAt(): Date | null {
    return this.props.endedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  markLive(at = new Date()): void {
    this.props = {
      ...this.props,
      status: StreamSessionStatus.LIVE,
      startedAt: at,
    };
  }

  disconnect(at = new Date()): void {
    this.props = {
      ...this.props,
      status: StreamSessionStatus.DISCONNECTED,
      endedAt: at,
    };
  }

  fail(at = new Date()): void {
    this.props = {
      ...this.props,
      status: StreamSessionStatus.FAILED,
      endedAt: at,
    };
  }

  toPrimitives(): StreamSessionProps {
    return { ...this.props };
  }
}
