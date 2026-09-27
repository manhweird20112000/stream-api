import { randomUUID } from 'node:crypto';

export enum StreamKeyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface StreamKeyProps {
  id: string;
  ownerUserId: string;
  keyHash: string;
  keyPrefix: string;
  status: StreamKeyStatus;
  rotatedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface CreateStreamKeyProps {
  ownerUserId: string;
  keyHash: string;
  keyPrefix: string;
}

export class StreamKey {
  private constructor(private props: StreamKeyProps) {}

  static create(input: CreateStreamKeyProps): StreamKey {
    return new StreamKey({
      id: randomUUID(),
      ownerUserId: input.ownerUserId,
      keyHash: input.keyHash,
      keyPrefix: input.keyPrefix,
      status: StreamKeyStatus.ACTIVE,
      rotatedAt: null,
      revokedAt: null,
      createdAt: new Date(),
    });
  }

  static rehydrate(props: StreamKeyProps): StreamKey {
    return new StreamKey({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get ownerUserId(): string {
    return this.props.ownerUserId;
  }

  get keyHash(): string {
    return this.props.keyHash;
  }

  get keyPrefix(): string {
    return this.props.keyPrefix;
  }

  get status(): StreamKeyStatus {
    return this.props.status;
  }

  get rotatedAt(): Date | null {
    return this.props.rotatedAt;
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  rotate(keyHash: string, keyPrefix: string, at = new Date()): void {
    this.props = { ...this.props, keyHash, keyPrefix, rotatedAt: at };
  }

  revoke(at = new Date()): void {
    this.props = {
      ...this.props,
      status: StreamKeyStatus.INACTIVE,
      revokedAt: at,
    };
  }

  toPrimitives(): StreamKeyProps {
    return { ...this.props };
  }
}
