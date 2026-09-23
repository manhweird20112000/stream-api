import { NotFoundException } from '@nestjs/common';
import * as path from 'node:path';

export function assertPrivateOwner(
  file: { ownerId: string; visibility: string } | null,
  userId: string,
): asserts file is { ownerId: string; visibility: 'private' } {
  if (!file || file.visibility !== 'private' || file.ownerId !== userId) {
    throw new NotFoundException('File not found');
  }
}

export function storedFilePath(
  basePath: string,
  visibility: 'public' | 'private',
  filename: string,
): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i.test(
      filename,
    )
  ) {
    throw new NotFoundException('File not found');
  }
  return path.join(basePath, visibility, filename);
}
