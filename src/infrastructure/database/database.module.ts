import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { config as loadEnv } from 'dotenv';

loadEnv({
  path: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env',
});

const databaseImports =
  process.env.DATABASE_ENABLED === 'true'
    ? [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            type: 'postgres',
            host: config.getOrThrow<string>('DATABASE_HOST'),
            port: Number(config.getOrThrow<string>('DATABASE_PORT')),
            username: config.getOrThrow<string>('DATABASE_USER'),
            password: config.getOrThrow<string>('DATABASE_PASSWORD'),
            database: config.getOrThrow<string>('DATABASE_NAME'),
            autoLoadEntities: true,
            synchronize: true,
          }),
        }),
      ]
    : [];

@Module({
  imports: databaseImports,
})
export class DatabaseModule {}
