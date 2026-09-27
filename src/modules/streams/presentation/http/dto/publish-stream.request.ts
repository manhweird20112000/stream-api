import { IsIP, IsOptional } from 'class-validator';

export class PublishStreamRequest {
  @IsOptional()
  @IsIP()
  publisherIp?: string;
}
