import { Readable } from 'node:stream';
import { StoredFile } from '../../domain/entities/stored-file';
import { FileNotFoundError } from '../../domain/errors/file-not-found.error';
import { StoredFileRepository } from '../../domain/repositories/stored-file.repository';
import { FileStoragePort } from '../ports/file-storage.port';
import { GetPrivateFileUseCase } from './get-private-file.use-case';

jest.mock('uuid', () => ({
  v7: () => '0196d7fa-9752-7048-baf4-de9c43877a67',
}));

class RepositoryFake implements StoredFileRepository {
  file: StoredFile | null = null;
  async insert(): Promise<void> {}
  async findById(): Promise<StoredFile | null> {
    return this.file;
  }
}

class StorageFake implements FileStoragePort {
  opened?: { visibility: 'public' | 'private'; filename: string };
  async store(): Promise<string> {
    return '';
  }
  async open(visibility: 'public' | 'private', filename: string) {
    this.opened = { visibility, filename };
    return {
      stream: Readable.from('private-file'),
      contentType: 'image/webp',
      contentLength: 12,
    };
  }
  async remove(): Promise<void> {}
}

describe('GetPrivateFileUseCase', () => {
  it('opens a private file owned by the caller', async () => {
    const repository = new RepositoryFake();
    const storage = new StorageFake();
    repository.file = StoredFile.restore({
      id: 'file-id',
      ownerId: 'user-a',
      visibility: 'private',
      filename: '0196d7fa-9752-7048-baf4-de9c43877a67.webp',
    });

    const result = await new GetPrivateFileUseCase(repository, storage).execute(
      {
        id: 'file-id',
        userId: 'user-a',
      },
    );

    expect(result.contentType).toBe('image/webp');
    expect(storage.opened).toEqual({
      visibility: 'private',
      filename: '0196d7fa-9752-7048-baf4-de9c43877a67.webp',
    });
  });

  it.each([
    null,
    StoredFile.restore({
      id: 'file-id',
      ownerId: 'user-b',
      visibility: 'private',
      filename: 'file.webp',
    }),
    StoredFile.restore({
      id: 'file-id',
      ownerId: 'user-a',
      visibility: 'public',
      filename: 'file.webp',
    }),
  ])('hides missing or inaccessible metadata', async (file) => {
    const repository = new RepositoryFake();
    repository.file = file;

    await expect(
      new GetPrivateFileUseCase(repository, new StorageFake()).execute({
        id: 'file-id',
        userId: 'user-a',
      }),
    ).rejects.toBeInstanceOf(FileNotFoundError);
  });
});
