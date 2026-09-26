import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { StreamsModule } from './streams/streams.module';

@Module({
  imports: [AuthModule, StreamsModule],
})
export class ContainerModules {}
