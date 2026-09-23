import { IsIn, IsOptional } from 'class-validator';
import type { FileVisibility } from '../../../domain/value-objects/file-visibility';

export class UploadFileRequest {
  @IsOptional()
  @IsIn(['public', 'private'])
  visibility?: FileVisibility;
}
