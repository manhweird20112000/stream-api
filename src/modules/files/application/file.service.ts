import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { createReadStream } from 'node:fs';
import { stat, unlink } from 'node:fs/promises';
import { ImageUtils } from '@/shared/utils/image';
import { assertPrivateOwner, storedFilePath } from './file-access';
import {
  FileVisibility,
  StoredFile,
} from '../infrastructure/persistence/entities/stored-file.entity';

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(StoredFile)
    private readonly files: EntityRepository<StoredFile>,
  ) {}

  async upload(
    file: Express.Multer.File,
    ownerId: string,
    visibility: FileVisibility,
  ) {
    const filename = await ImageUtils.storage(file, { folder: visibility });
    const record = new StoredFile();
    record.ownerId = ownerId;
    record.visibility = visibility;
    record.filename = filename;

    try {
      await this.files.insert(record);
    } catch (error) {
      await unlink(
        storedFilePath(ImageUtils.basePath, visibility, filename),
      ).catch(() => undefined);
      throw error;
    }

    return {
      id: record.id,
      visibility,
      url:
        visibility === 'public'
          ? `/assets/${filename}`
          : `/api/files/${record.id}`,
    };
  }

  async privateFile(id: string, userId: string): Promise<StreamableFile> {
    const record = await this.files.findOne({ id });
    assertPrivateOwner(record, userId);

    const filePath = storedFilePath(
      ImageUtils.basePath,
      'private',
      record.filename,
    );
    const fileStat = await stat(filePath).catch(() => {
      throw new NotFoundException('File not found');
    });
    if (!fileStat.isFile()) throw new NotFoundException('File not found');

    return new StreamableFile(createReadStream(filePath), {
      type: 'image/webp',
      length: fileStat.size,
    });
  }
}
