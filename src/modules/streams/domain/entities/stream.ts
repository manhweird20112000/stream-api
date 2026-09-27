import { randomUUID } from 'node:crypto';

export enum StreamStatus {
  CREATED = 'CREATED',
  READY = 'READY',
  LIVE = 'LIVE',
  ENDING = 'ENDING',
  ENDED = 'ENDED',
  ERROR = 'ERROR',
}

export enum StreamVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  UNLISTED = 'UNLISTED',
}

export interface StreamProps {
  id: string;
  ownerUserId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  visibility: StreamVisibility;
  status: StreamStatus;
  playbackId: string | null;
  streamKeyId: string | null;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
}

export interface CreateStreamProps {
  ownerUserId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string | null;
  visibility?: StreamVisibility;
}

export interface UpdateStreamMetadataProps {
  title?: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  visibility?: StreamVisibility;
  at?: Date;
}

export class Stream {
  private constructor(private props: StreamProps) {}

  static create(input: CreateStreamProps): Stream {
    const now = new Date();

    return new Stream({
      id: randomUUID(),
      ownerUserId: input.ownerUserId,
      title: input.title,
      description: input.description ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      visibility: input.visibility ?? StreamVisibility.PRIVATE,
      status: StreamStatus.CREATED,
      playbackId: null,
      streamKeyId: null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      endedAt: null,
    });
  }

  static rehydrate(props: StreamProps): Stream {
    return new Stream({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get ownerUserId(): string {
    return this.props.ownerUserId;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string | null {
    return this.props.description;
  }

  get thumbnailUrl(): string | null {
    return this.props.thumbnailUrl;
  }

  get visibility(): StreamVisibility {
    return this.props.visibility;
  }

  get status(): StreamStatus {
    return this.props.status;
  }

  get playbackId(): string | null {
    return this.props.playbackId;
  }

  get streamKeyId(): string | null {
    return this.props.streamKeyId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get startedAt(): Date | null {
    return this.props.startedAt;
  }

  get endedAt(): Date | null {
    return this.props.endedAt;
  }

  updateMetadata(input: UpdateStreamMetadataProps): void {
    this.props = {
      ...this.props,
      title: input.title ?? this.props.title,
      description:
        input.description === undefined
          ? this.props.description
          : input.description,
      thumbnailUrl:
        input.thumbnailUrl === undefined
          ? this.props.thumbnailUrl
          : input.thumbnailUrl,
      visibility: input.visibility ?? this.props.visibility,
      updatedAt: input.at ?? new Date(),
    };
  }

  assignStreamKey(streamKeyId: string, at = new Date()): void {
    this.props = { ...this.props, streamKeyId, updatedAt: at };
  }

  markReady(input: { playbackId?: string | null; at?: Date } = {}): void {
    this.props = {
      ...this.props,
      status: StreamStatus.READY,
      playbackId: input.playbackId ?? this.props.playbackId,
      updatedAt: input.at ?? new Date(),
    };
  }

  start(at = new Date()): void {
    this.props = {
      ...this.props,
      status: StreamStatus.LIVE,
      startedAt: at,
      updatedAt: at,
    };
  }

  end(at = new Date()): void {
    this.props = {
      ...this.props,
      status: StreamStatus.ENDED,
      endedAt: at,
      updatedAt: at,
    };
  }

  fail(at = new Date()): void {
    this.props = {
      ...this.props,
      status: StreamStatus.ERROR,
      updatedAt: at,
    };
  }

  toPrimitives(): StreamProps {
    return { ...this.props };
  }
}
