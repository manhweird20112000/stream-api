import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';
import { StreamSessionStatus } from '../../../domain/entities/stream-session';
import { StreamEntity } from './stream.entity';

@Entity('stream_sessions')
@Index('IDX_stream_sessions_stream_id', ['streamId'])
@Index('IDX_stream_sessions_status', ['status'])
export class StreamSessionEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'uuid', name: 'stream_id' })
  streamId!: string;

  @Column({ type: 'enum', enum: StreamSessionStatus })
  status!: StreamSessionStatus;

  @Column({ type: 'inet', name: 'publisher_ip', nullable: true })
  publisherIp!: string | null;

  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'ended_at', nullable: true })
  endedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => StreamEntity, (stream) => stream.streamSessions)
  @JoinColumn({ name: 'stream_id' })
  stream!: Relation<StreamEntity>;
}
