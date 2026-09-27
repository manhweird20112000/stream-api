import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StreamStatus, StreamVisibility } from '../../../domain/entities/stream';
import { StreamEventEntity } from './stream-event.entity';
import { StreamKeysEntity } from './stream-keys.entity';
import { StreamSessionEntity } from './stream-session.entity';

@Entity('streams')
@Index('IDX_streams_owner_user_id', ['ownerUserId'])
@Index('IDX_streams_status', ['status'])
@Index('IDX_streams_created_at', ['createdAt'])
export class StreamEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'uuid', name: 'owner_user_id' })
  ownerUserId!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', name: 'thumbnail_url', nullable: true })
  thumbnailUrl!: string | null;

  @Column({ type: 'enum', enum: StreamVisibility })
  visibility!: StreamVisibility;

  @Column({ type: 'enum', enum: StreamStatus, default: StreamStatus.CREATED })
  status!: StreamStatus;

  @Column({ type: 'varchar', name: 'playback_id', nullable: true })
  playbackId!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'ended_at', nullable: true })
  endedAt!: Date | null;

  @Column({ type: 'uuid', name: 'stream_key_id', nullable: true })
  streamKeyId!: string | null;

  @ManyToOne(() => StreamKeysEntity, (streamKey) => streamKey.streams, {
    nullable: true,
  })
  @JoinColumn({ name: 'stream_key_id' })
  streamKey!: StreamKeysEntity | null;

  @OneToMany(() => StreamSessionEntity, (streamSession) => streamSession.stream)
  streamSessions!: StreamSessionEntity[];

  @OneToMany(() => StreamEventEntity, (streamEvent) => streamEvent.stream)
  streamEvents!: StreamEventEntity[];
}
