import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SecretModule } from '@/infrastructure/secret';
import { IAdapterSecret } from '@/infrastructure/secret/adapter';
import { FileStoragePort } from './application/ports/file-storage.port';
import { GetPrivateFileUseCase } from './application/use-cases/get-private-file.use-case';
import { UploadFileUseCase } from './application/use-cases/upload-file.use-case';
import { StoredFileRepository } from './domain/repositories/stored-file.repository';
import { StoredFileOrmEntity } from './infrastructure/persistence/entities/stored-file.orm-entity';
import { MikroStoredFileRepository } from './infrastructure/persistence/repositories/mikro-stored-file.repository';
import { LocalFileStorageAdapter } from './infrastructure/storage/local-file-storage.adapter';
import { FileController } from './presentation/http/file.controller';
import { JwtAuthGuard } from './presentation/http/guards/jwt-auth.guard';

@Module({
  imports: [
    MikroOrmModule.forFeature([StoredFileOrmEntity]),
    JwtModule.registerAsync({
      imports: [SecretModule],
      inject: [IAdapterSecret],
      useFactory: (secrets: IAdapterSecret) => ({ secret: secrets.JWT_SECRET }),
    }),
  ],
  controllers: [FileController],
  providers: [
    JwtAuthGuard,
    MikroStoredFileRepository,
    LocalFileStorageAdapter,
    { provide: StoredFileRepository, useExisting: MikroStoredFileRepository },
    { provide: FileStoragePort, useExisting: LocalFileStorageAdapter },
    {
      provide: UploadFileUseCase,
      inject: [StoredFileRepository, FileStoragePort],
      useFactory: (
        repository: StoredFileRepository,
        storage: FileStoragePort,
      ) => new UploadFileUseCase(repository, storage),
    },
    {
      provide: GetPrivateFileUseCase,
      inject: [StoredFileRepository, FileStoragePort],
      useFactory: (
        repository: StoredFileRepository,
        storage: FileStoragePort,
      ) => new GetPrivateFileUseCase(repository, storage),
    },
  ],
})
export class FilesModule {}
