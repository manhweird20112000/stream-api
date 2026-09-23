import { StoredFile } from '../../domain/entities/stored-file';
import { StoredFileRepository } from '../../domain/repositories/stored-file.repository';
import type { UploadFileInput } from '../dto/upload-file.input';
import type { FileOutput } from '../dto/file.output';
import { FileStoragePort } from '../ports/file-storage.port';

export class UploadFileUseCase {
  constructor(
    private readonly repository: StoredFileRepository,
    private readonly storage: FileStoragePort,
  ) {}

  async execute(input: UploadFileInput): Promise<FileOutput> {
    const filename = await this.storage.store({
      buffer: input.file.buffer,
      mimetype: input.file.mimetype,
      visibility: input.visibility,
    });
    const file = StoredFile.create({
      ownerId: input.ownerId,
      visibility: input.visibility,
      filename,
    });

    try {
      await this.repository.insert(file);
    } catch (error) {
      await this.storage
        .remove(input.visibility, filename)
        .catch(() => undefined);
      throw error;
    }

    return {
      id: file.id,
      visibility: file.visibility,
      url:
        file.visibility === 'public'
          ? `/assets/${file.filename}`
          : `/api/files/${file.id}`,
    };
  }
}
