import type { StoredFile } from '../entities/stored-file';

export abstract class StoredFileRepository {
  abstract insert(file: StoredFile): Promise<void>;
  abstract findById(id: string): Promise<StoredFile | null>;
}
