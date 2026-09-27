import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { StreamVisibility } from '../../../domain/entities/stream';

export class CreateStreamRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  thumbnailUrl?: string;

  @IsOptional()
  @IsEnum(StreamVisibility)
  visibility?: StreamVisibility;
}
