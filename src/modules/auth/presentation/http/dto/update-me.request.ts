import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateMeRequest {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  avatarUrl?: string | null;
}
