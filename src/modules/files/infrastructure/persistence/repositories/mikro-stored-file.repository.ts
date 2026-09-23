import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { StoredFile } from '../../../domain/entities/stored-file';
import { StoredFileRepository } from '../../../domain/repositories/stored-file.repository';
import { StoredFileOrmEntity } from '../entities/stored-file.orm-entity';
import { StoredFileMapper } from '../mappers/stored-file.mapper';

@Injectable()
export class MikroStoredFileRepository implements StoredFileRepository {
  constructor(
    @InjectRepository(StoredFileOrmEntity)
    private readonly repository: EntityRepository<StoredFileOrmEntity>,
  ) {}

  async insert(file: StoredFile): Promise<void> {
    await this.repository.insert(StoredFileMapper.toPersistence(file));
  }

  async findById(id: string): Promise<StoredFile | null> {
    const entity = await this.repository.findOne({ id });
    return entity ? StoredFileMapper.toDomain(entity) : null;
  }
}
