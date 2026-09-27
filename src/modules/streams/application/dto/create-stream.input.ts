import type { StreamVisibility } from '../../domain/entities/stream';

export interface CreateStreamInput {
  userId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string | null;
  visibility?: StreamVisibility;
}
