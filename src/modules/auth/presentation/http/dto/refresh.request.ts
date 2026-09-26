import { IsOptional, IsString } from 'class-validator';

export class RefreshRequest {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
