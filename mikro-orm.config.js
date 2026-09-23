require('reflect-metadata');

const { config } = require('dotenv');
const { Migrator } = require('@mikro-orm/migrations');
const { defineConfig, PostgreSqlDriver } = require('@mikro-orm/postgresql');

config({ path: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env' });

const postgresUri =
  process.env.POSTGRES_URI ||
  `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

module.exports = defineConfig({
  driver: PostgreSqlDriver,
  clientUrl: postgresUri,
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
