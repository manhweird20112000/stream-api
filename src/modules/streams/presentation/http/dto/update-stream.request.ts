import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { StreamVisibility } from '../../../domain/entities/stream';

export class UpdateStreamRequest {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  thumbnailUrl?: string | null;

  @IsOptional()
  @IsEnum(StreamVisibility)
  visibility?: StreamVisibility;
}
