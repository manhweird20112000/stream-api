import { Injectable } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import * as path from 'node:path';
import * as process from 'node:process';
import * as sharp from 'sharp';
import { v7 as uuidv7 } from 'uuid';
import {
  FileStoragePort,
  type OpenFileResult,
  type StoreFileInput,
} from '../../application/ports/file-storage.port';
import type { FileVisibility } from '../../domain/value-objects/file-visibility';

@Injectable()
export class LocalFileStorageAdapter implements FileStoragePort {
  constructor(
    private readonly basePath = path.join(process.cwd(), 'storages'),
  ) {}

  async store(input: StoreFileInput): Promise<string> {
    const accepted = ['image/jpeg', 'image/png'];
    if (!accepted.includes(input.mimetype) || input.buffer.length > 1024 * 1024) {
      throw new Error(
        input.buffer.length > 1024 * 1024
          ? 'Image exceeds maximum size'
          : 'Unsupported image type',
      );
    }

    const metadata = await sharp(input.buffer).metadata();
    const actualMime = `image/${metadata.format === 'jpeg' ? 'jpeg' : metadata.format}`;
    if (!accepted.includes(actualMime) || actualMime !== input.mimetype) {
      throw new Error('Unsupported image type');
    }

    const directory = path.join(this.basePath, input.visibility);
    await mkdir(directory, { recursive: true });
    const filename = `${uuidv7()}.webp`;
    await sharp(input.buffer).webp({ quality: 80 }).toFile(path.join(directory, filename));
    return filename;
  }

  async open(
    visibility: FileVisibility,
    filename: string,
  ): Promise<OpenFileResult> {
    const filePath = this.resolvePath(visibility, filename);
    const fileStat = await stat(filePath).catch(() => {
      throw new Error('File not found');
    });
    if (!fileStat.isFile()) throw new Error('File not found');
    return {
      stream: createReadStream(filePath),
      contentType: 'image/webp',
      contentLength: fileStat.size,
    };
  }

  async remove(visibility: FileVisibility, filename: string): Promise<void> {
    await unlink(this.resolvePath(visibility, filename));
  }

  private resolvePath(visibility: FileVisibility, filename: string): string {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i.test(filename)) {
      throw new Error('File not found');
    }
    return path.join(this.basePath, visibility, filename);
  }
}
