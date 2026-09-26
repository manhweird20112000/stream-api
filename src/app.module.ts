import { Module } from '@nestjs/common';
import { SecretModule } from '@/infrastructure/secret';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from '@/infrastructure/config/logger.config';
import { ContainerModules } from './modules';
import { DebugController } from './debug.controller';
import { HealthModule } from '@/infrastructure/health/health.module';

const controllers =
  process.env.NODE_ENV === 'development' &&
  process.env.ENABLE_DEBUG_ROUTES === 'true'
    ? [DebugController]
    : [];

@Module({
  imports: [
    WinstonModule.forRoot(winstonConfig),
    SecretModule,
    HealthModule,
    ContainerModules,
  ],
  controllers,
  providers: [],
})
export class AppModule {}
