import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import * as sharp from 'sharp';
import { LocalFileStorageAdapter } from './local-file-storage.adapter';

jest.mock('uuid', () => ({
  v7: () => '0196d7fa-9752-7048-baf4-de9c43877a67',
}));

describe('LocalFileStorageAdapter', () => {
  let root: string;
  let storage: LocalFileStorageAdapter;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'file-storage-'));
    storage = new LocalFileStorageAdapter(root);
  });

  afterEach(async () => rm(root, { recursive: true, force: true }));

  it('stores a verified image as WebP', async () => {
    const buffer = await sharp({
      create: { width: 100, height: 200, channels: 3, background: 'red' },
    })
      .png()
      .toBuffer();

    const filename = await storage.store({
      buffer,
      mimetype: 'image/png',
      visibility: 'private',
    });
    const metadata = await sharp(
      await readFile(path.join(root, 'private', filename)),
    ).metadata();

    expect(metadata.format).toBe('webp');
  });

  it('rejects unsupported content and unsafe filenames', async () => {
    await expect(
      storage.store({
        buffer: Buffer.from('not-image'),
        mimetype: 'text/plain',
        visibility: 'private',
      }),
    ).rejects.toThrow('Unsupported image type');
    await expect(storage.open('private', '../secret.webp')).rejects.toThrow(
      'File not found',
    );
  });
});
