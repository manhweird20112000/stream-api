import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { StreamKeyStatus } from '../../../domain/entities/stream-key';
import { StreamEntity } from './stream.entity';

@Entity('stream_keys')
@Index('IDX_stream_keys_owner_user_id', ['ownerUserId'])
@Index('IDX_stream_keys_key_hash', ['keyHash'])
@Index('IDX_stream_keys_status', ['status'])
export class StreamKeysEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'uuid', name: 'owner_user_id' })
  ownerUserId!: string;

  @Column({ type: 'varchar', name: 'key_hash' })
  keyHash!: string;

  @Column({ type: 'varchar', name: 'key_prefix' })
  keyPrefix!: string;

  @Column({
    type: 'enum',
    enum: StreamKeyStatus,
    name: 'status',
    default: StreamKeyStatus.ACTIVE,
  })
  status!: StreamKeyStatus;

  @Column({ type: 'timestamptz', name: 'rotated_at', nullable: true })
  rotatedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => StreamEntity, (stream) => stream.streamKey)
  streams!: StreamEntity[];
}
