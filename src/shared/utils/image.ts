import * as uuid from 'uuid';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as sharp from 'sharp';
import * as process from 'node:process';
import { BadRequestException } from '@nestjs/common';

type IImageOptionType = 'original' | '16x9' | '4x3' | 'square';

interface IImageOptions {
  accepts?: string[];
  maxSize?: number;
  type?: IImageOptionType;
  folder?: string;
}

interface IImageCropMetadata {
  width: number;
  height: number;
  left: number;
  top: number;
  format: string;
}

export class ImageUtils {
  static basePath = path.join(process.cwd(), 'storages');

  static async storage(
    file: Express.Multer.File,
    options: IImageOptions = {
      accepts: ['image/jpeg', 'image/png'],
      maxSize: 1024 * 1024,
      type: 'original',
      folder: 'user',
    },
  ): Promise<string> {
    const {
      accepts = ['image/jpeg', 'image/png'],
      maxSize = 1024 * 1024,
      type = 'original',
      folder = 'user',
    } = options;

    if (!accepts.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported image type');
    }
    if (file.buffer.length > maxSize) {
      throw new BadRequestException('Image exceeds maximum size');
    }

    const metadata = await this.getCropMetadata(file, type);
    const actualMimeType = `image/${metadata.format === 'jpeg' ? 'jpeg' : metadata.format}`;
    if (!accepts.includes(actualMimeType) || actualMimeType !== file.mimetype) {
      throw new BadRequestException('Unsupported image type');
    }

    const pathStorage = path.join(this.basePath, folder);

    if (!fs.existsSync(pathStorage)) {
      fs.mkdirSync(pathStorage, { recursive: true });
    }

    const filename = uuid.v7() + '.webp';

    const image = sharp(file.buffer);
    image.extract(metadata).webp({ quality: 80 });
    await image.toFile(path.join(pathStorage, filename));
    return filename;
  }

  static async getCropMetadata(
    file: Express.Multer.File,
    type?: IImageOptionType,
  ): Promise<IImageCropMetadata> {
    const metadata = await sharp(file.buffer).metadata();

    const data: IImageCropMetadata = {
      width: metadata.width,
      height: metadata.height,
      left: 0,
      top: 0,
      format: metadata.format,
    };
    const ratio =
      type === '4x3'
        ? 4 / 3
        : type === '16x9'
          ? 16 / 9
          : type === 'square'
            ? 1
            : null;
    if (ratio) {
      if (metadata.width / metadata.height > ratio) {
        data.width = Math.max(1, Math.floor(metadata.height * ratio));
        data.left = Math.floor((metadata.width - data.width) / 2);
      } else {
        data.height = Math.max(1, Math.floor(metadata.width / ratio));
        data.top = Math.floor((metadata.height - data.height) / 2);
      }
    }
    return data;
  }
}
