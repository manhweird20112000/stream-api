import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecretModule } from '@/infrastructure/secret';
import { IAdapterSecret } from '@/infrastructure/secret/adapter';
import { CreateAuthTables20260925000000 } from './migrations/20260925000000-create-auth-tables';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [SecretModule],
      inject: [IAdapterSecret],
      useFactory: (secrets: IAdapterSecret) => ({
        type: 'postgres',
        host: secrets.DATABASE_HOST,
        port: secrets.DATABASE_PORT,
        username: secrets.DATABASE_USER,
        password: secrets.DATABASE_PASSWORD,
        database: secrets.DATABASE_NAME,
        autoLoadEntities: true,
        migrations: [CreateAuthTables20260925000000],
        migrationsRun: secrets.DATABASE_MIGRATIONS_RUN,
        synchronize: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
