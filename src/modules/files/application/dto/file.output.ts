import type { Readable } from 'node:stream';
import type { FileVisibility } from '../../domain/value-objects/file-visibility';

export interface FileOutput {
  id: string;
  visibility: FileVisibility;
  url: string;
}

export interface StoredFileContent {
  stream: Readable;
  contentType: string;
  contentLength: number;
}
