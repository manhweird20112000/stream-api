import type {
  Stream,
  StreamStatus,
  StreamVisibility,
} from '../../../domain/entities/stream';

export class StreamResponse {
  id!: string;
  title!: string;
  description!: string | null;
  thumbnailUrl!: string | null;
  visibility!: StreamVisibility;
  status!: StreamStatus;
  createdAt!: Date;
  updatedAt!: Date;

  static fromDomain(stream: Stream): StreamResponse {
    return {
      id: stream.id,
      title: stream.title,
      description: stream.description,
      thumbnailUrl: stream.thumbnailUrl,
      visibility: stream.visibility,
      status: stream.status,
      createdAt: stream.createdAt,
      updatedAt: stream.updatedAt,
    };
  }
}
