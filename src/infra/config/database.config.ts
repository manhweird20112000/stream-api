import 'reflect-metadata';
import { config } from 'dotenv';
import { Migrator } from '@mikro-orm/migrations';
import { defineConfig, PostgreSqlDriver } from '@mikro-orm/postgresql';
import type { IAdapterSecret } from '../secret/adapter';

config({ path: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env' });

type DatabaseSecrets = Pick<IAdapterSecret, 'POSTGRES_URI'>;

export function createMikroOrmConfig({ POSTGRES_URI }: DatabaseSecrets) {
  return defineConfig({
    driver: PostgreSqlDriver,
    clientUrl: POSTGRES_URI,
    entities: [
      'dist/modules/**/infrastructure/persistence/entities/**/*.orm-entity.js',
    ],
    entitiesTs: [
      'src/modules/**/infrastructure/persistence/entities/**/*.orm-entity.ts',
    ],
    discovery: {
      warnWhenNoEntities: false,
    },
    extensions: [Migrator],
    migrations: {
      tableName: 'migration_collection',
      path: 'dist/modules',
      pathTs: 'src/modules',
      glob: '**/infrastructure/persistence/migrations/!(*.d).{js,ts,cjs}',
      emit: 'ts',
    },
    debug: process.env.NODE_ENV === 'development',
  });
}

const postgresUri =
  process.env.POSTGRES_URI ||
  `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

export default createMikroOrmConfig({ POSTGRES_URI: postgresUri });
