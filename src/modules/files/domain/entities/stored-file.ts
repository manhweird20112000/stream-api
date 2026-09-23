import { v7 as uuidv7 } from 'uuid';
import type { FileVisibility } from '../value-objects/file-visibility';

export interface StoredFileProps {
  id: string;
  ownerId: string;
  visibility: FileVisibility;
  filename: string;
}

export class StoredFile {
  private constructor(private readonly props: StoredFileProps) {}

  static create(props: Omit<StoredFileProps, 'id'>): StoredFile {
    return new StoredFile({ id: uuidv7(), ...props });
  }

  static restore(props: StoredFileProps): StoredFile {
    return new StoredFile(props);
  }

  get id(): string {
    return this.props.id;
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  get visibility(): FileVisibility {
    return this.props.visibility;
  }

  get filename(): string {
    return this.props.filename;
  }
}
