import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStreamRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
