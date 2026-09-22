import * as sharp from 'sharp';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ImageUtils } from './image';

jest.mock('uuid', () => ({ v7: () => 'test-image' }));

describe('ImageUtils', () => {
  it('crops a tall image to 16:9 inside its bounds', async () => {
    const buffer = await sharp({
      create: { width: 100, height: 200, channels: 3, background: 'red' },
    })
      .png()
      .toBuffer();
    const file = {
      buffer,
      mimetype: 'image/png',
      size: buffer.length,
    } as Express.Multer.File;

    const crop = await ImageUtils.getCropMetadata(file, '16x9');

    expect(crop).toMatchObject({ width: 100, height: 56, left: 0, top: 72 });
  });

  it('rejects a file outside the allowed mime types before storing', async () => {
    const file = {
      buffer: Buffer.from('not an image'),
      mimetype: 'text/plain',
      size: 12,
    } as Express.Multer.File;

    await expect(
      ImageUtils.storage(file, { accepts: ['image/png'], maxSize: 100 }),
    ).rejects.toThrow('Unsupported image type');
  });

  it('rejects a file over the size limit', async () => {
    const file = {
      buffer: Buffer.alloc(101),
      mimetype: 'image/png',
      size: 101,
    } as Express.Multer.File;

    await expect(
      ImageUtils.storage(file, { accepts: ['image/png'], maxSize: 100 }),
    ).rejects.toThrow('Image exceeds maximum size');
  });

  it('stores the requested crop as WebP', async () => {
    const buffer = await sharp({
      create: { width: 100, height: 200, channels: 3, background: 'red' },
    })
      .png()
      .toBuffer();
    const file = {
      buffer,
      mimetype: 'image/png',
      size: buffer.length,
    } as Express.Multer.File;
    const folder = `image-test-${randomUUID()}`;
    const directory = path.join(ImageUtils.basePath, folder);
    let output: string | undefined;

    try {
      const filename = await ImageUtils.storage(file, { folder, type: '16x9' });
      output = path.join(directory, filename);
      expect(await sharp(fs.readFileSync(output)).metadata()).toMatchObject({
        width: 100,
        height: 56,
        format: 'webp',
      });
    } finally {
      if (output && fs.existsSync(output)) fs.unlinkSync(output);
      if (fs.existsSync(directory)) fs.rmdirSync(directory);
    }
  });
});
