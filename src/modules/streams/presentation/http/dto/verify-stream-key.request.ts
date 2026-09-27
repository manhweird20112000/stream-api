import { IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyStreamKeyRequest {
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  streamKey!: string;
}
