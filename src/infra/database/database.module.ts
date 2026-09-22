import { Module } from '@nestjs/common';
import {
  MikroOrmModule,
  type MikroOrmModuleAsyncOptions,
} from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { SecretModule } from '@/infra/secret';
import { IAdapterSecret } from '@/infra/secret/adapter';
import { createMikroOrmConfig } from '@/infra/config/database.config';

@Module({
  imports: [
    MikroOrmModule.forRootAsync({
      // The Nest adapter types this option as the generic driver, not PostgreSqlDriver.
      driver:
        PostgreSqlDriver as unknown as MikroOrmModuleAsyncOptions['driver'],
      useFactory: (secrets: IAdapterSecret) => createMikroOrmConfig(secrets),
      imports: [SecretModule],
      inject: [IAdapterSecret],
    }),
  ],
})
export class DatabaseModule {}
