import type { FileVisibility } from '../../domain/value-objects/file-visibility';

export interface UploadFileInput {
  file: { buffer: Buffer; mimetype: string };
  ownerId: string;
  visibility: FileVisibility;
}
