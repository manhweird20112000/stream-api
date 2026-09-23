import type { Readable } from 'node:stream';
import type { FileVisibility } from '../../domain/value-objects/file-visibility';

export interface StoreFileInput {
  buffer: Buffer;
  mimetype: string;
  visibility: FileVisibility;
}

export interface OpenFileResult {
  stream: Readable;
  contentType: string;
  contentLength: number;
}

export abstract class FileStoragePort {
  abstract store(input: StoreFileInput): Promise<string>;
  abstract open(
    visibility: FileVisibility,
    filename: string,
  ): Promise<OpenFileResult>;
  abstract remove(visibility: FileVisibility, filename: string): Promise<void>;
}
