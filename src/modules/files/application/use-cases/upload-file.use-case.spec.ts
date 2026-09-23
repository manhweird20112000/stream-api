import { Readable } from 'node:stream';
import { StoredFile } from '../../domain/entities/stored-file';
import { StoredFileRepository } from '../../domain/repositories/stored-file.repository';
import { FileStoragePort } from '../ports/file-storage.port';
import { UploadFileUseCase } from './upload-file.use-case';

jest.mock('uuid', () => ({
  v7: () => '0196d7fa-9752-7048-baf4-de9c43877a67',
}));

class RepositoryFake implements StoredFileRepository {
  inserted?: StoredFile;
  error?: Error;

  async insert(file: StoredFile): Promise<void> {
    if (this.error) throw this.error;
    this.inserted = file;
  }

  async findById(): Promise<StoredFile | null> {
    return null;
  }
}

class StorageFake implements FileStoragePort {
  removed?: { visibility: 'public' | 'private'; filename: string };

  async store(): Promise<string> {
    return '0196d7fa-9752-7048-baf4-de9c43877a67.webp';
  }

  async open() {
    return {
      stream: Readable.from('file'),
      contentType: 'image/webp',
      contentLength: 4,
    };
  }

  async remove(visibility: 'public' | 'private', filename: string) {
    this.removed = { visibility, filename };
  }
}

describe('UploadFileUseCase', () => {
  it('stores private metadata and returns its protected URL', async () => {
    const repository = new RepositoryFake();
    const useCase = new UploadFileUseCase(repository, new StorageFake());

    await expect(
      useCase.execute({
        file: { buffer: Buffer.from('image'), mimetype: 'image/png' },
        ownerId: 'user-a',
        visibility: 'private',
      }),
    ).resolves.toEqual({
      id: '0196d7fa-9752-7048-baf4-de9c43877a67',
      visibility: 'private',
      url: '/api/files/0196d7fa-9752-7048-baf4-de9c43877a67',
    });
    expect(repository.inserted?.ownerId).toBe('user-a');
  });

  it('removes the stored file when metadata persistence fails', async () => {
    const repository = new RepositoryFake();
    const storage = new StorageFake();
    repository.error = new Error('database unavailable');
    const useCase = new UploadFileUseCase(repository, storage);

    await expect(
      useCase.execute({
        file: { buffer: Buffer.from('image'), mimetype: 'image/png' },
        ownerId: 'user-a',
        visibility: 'public',
      }),
    ).rejects.toThrow('database unavailable');
    expect(storage.removed).toEqual({
      visibility: 'public',
      filename: '0196d7fa-9752-7048-baf4-de9c43877a67.webp',
    });
  });
});
