import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { StreamEntity } from './stream.entity';

@Entity('stream_events')
@Index('IDX_stream_events_stream_id', ['streamId'])
@Index('IDX_stream_events_session_id', ['sessionId'])
@Index('IDX_stream_events_event_type', ['eventType'])
export class StreamEventEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'uuid', name: 'stream_id' })
  streamId!: string;

  @ManyToOne(() => StreamEntity, (stream) => stream.streamEvents)
  @JoinColumn({ name: 'stream_id' })
  stream!: StreamEntity;

  @Column({ type: 'uuid', name: 'session_id', nullable: true })
  sessionId!: string | null;

  @Column({ type: 'varchar', name: 'event_type' })
  eventType!: string;

  @Column({ type: 'jsonb', name: 'event_data' })
  eventData!: unknown;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
