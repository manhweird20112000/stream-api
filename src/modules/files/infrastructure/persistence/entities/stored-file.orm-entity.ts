import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import type { FileVisibility } from '../../../domain/value-objects/file-visibility';

@Entity({ tableName: 'stored_files' })
export class StoredFileOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'string', fieldName: 'owner_id', length: 255 })
  ownerId!: string;

  @Property({ type: 'string', length: 7 })
  visibility!: FileVisibility;

  @Property({ type: 'string', length: 255 })
  filename!: string;
}
