import { Module, type Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { config as loadEnv } from 'dotenv';
import { STREAM_EVENT_REPOSITORY } from '../../domain/repositories/stream-event.repository';
import { STREAM_KEY_REPOSITORY } from '../../domain/repositories/stream-key.repository';
import { STREAM_SESSION_REPOSITORY } from '../../domain/repositories/stream-session.repository';
import { STREAM_REPOSITORY } from '../../domain/repositories/stream.repository';
import { StreamEventEntity } from './entities/stream-event.entity';
import { StreamKeysEntity } from './entities/stream-keys.entity';
import { StreamSessionEntity } from './entities/stream-session.entity';
import { StreamEntity } from './entities/stream.entity';
import { InMemoryStreamEventRepository } from './repositories/in-memory-stream-event.repository';
import { InMemoryStreamKeyRepository } from './repositories/in-memory-stream-key.repository';
import { InMemoryStreamSessionRepository } from './repositories/in-memory-stream-session.repository';
import { InMemoryStreamRepository } from './repositories/in-memory-stream.repository';
import { TypeOrmStreamEventRepository } from './repositories/typeorm-stream-event.repository';
import { TypeOrmStreamKeyRepository } from './repositories/typeorm-stream-key.repository';
import { TypeOrmStreamSessionRepository } from './repositories/typeorm-stream-session.repository';
import { TypeOrmStreamRepository } from './repositories/typeorm-stream.repository';

loadEnv({
  path: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env',
});

const databaseEnabled = process.env.DATABASE_ENABLED === 'true';

const repositoryProviders: Provider[] = [
  {
    provide: STREAM_REPOSITORY,
    useClass: databaseEnabled
      ? TypeOrmStreamRepository
      : InMemoryStreamRepository,
  },
  {
    provide: STREAM_KEY_REPOSITORY,
    useClass: databaseEnabled
      ? TypeOrmStreamKeyRepository
      : InMemoryStreamKeyRepository,
  },
  {
    provide: STREAM_SESSION_REPOSITORY,
    useClass: databaseEnabled
      ? TypeOrmStreamSessionRepository
      : InMemoryStreamSessionRepository,
  },
  {
    provide: STREAM_EVENT_REPOSITORY,
    useClass: databaseEnabled
      ? TypeOrmStreamEventRepository
      : InMemoryStreamEventRepository,
  },
];

@Module({
  imports: databaseEnabled
    ? [
        TypeOrmModule.forFeature([
          StreamKeysEntity,
          StreamEntity,
          StreamSessionEntity,
          StreamEventEntity,
        ]),
      ]
    : [],
  providers: repositoryProviders,
  exports: [
    STREAM_REPOSITORY,
    STREAM_KEY_REPOSITORY,
    STREAM_SESSION_REPOSITORY,
    STREAM_EVENT_REPOSITORY,
  ],
})
export class StreamsPersistenceModule {}
