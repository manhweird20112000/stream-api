import { FileNotFoundError } from '../../domain/errors/file-not-found.error';
import { StoredFileRepository } from '../../domain/repositories/stored-file.repository';
import type { StoredFileContent } from '../dto/file.output';
import { FileStoragePort } from '../ports/file-storage.port';

export class GetPrivateFileUseCase {
  constructor(
    private readonly repository: StoredFileRepository,
    private readonly storage: FileStoragePort,
  ) {}

  async execute(input: {
    id: string;
    userId: string;
  }): Promise<StoredFileContent> {
    const file = await this.repository.findById(input.id);
    if (
      !file ||
      file.visibility !== 'private' ||
      file.ownerId !== input.userId
    ) {
      throw new FileNotFoundError();
    }
    return this.storage.open('private', file.filename);
  }
}
