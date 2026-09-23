import { StoredFile } from '../../../domain/entities/stored-file';
import { StoredFileOrmEntity } from '../entities/stored-file.orm-entity';

export class StoredFileMapper {
  static toDomain(entity: StoredFileOrmEntity): StoredFile {
    return StoredFile.restore({
      id: entity.id,
      ownerId: entity.ownerId,
      visibility: entity.visibility,
      filename: entity.filename,
    });
  }

  static toPersistence(file: StoredFile): StoredFileOrmEntity {
    const entity = new StoredFileOrmEntity();
    entity.id = file.id;
    entity.ownerId = file.ownerId;
    entity.visibility = file.visibility;
    entity.filename = file.filename;
    return entity;
  }
}
