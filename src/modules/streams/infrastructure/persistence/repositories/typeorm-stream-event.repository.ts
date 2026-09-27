import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { StreamEvent } from '../../../domain/entities/stream-event';
import type { StreamEventRepository } from '../../../domain/repositories/stream-event.repository';
import { StreamEventEntity } from '../entities/stream-event.entity';
import { StreamEventMapper } from '../mappers/stream-event.mapper';

@Injectable()
export class TypeOrmStreamEventRepository implements StreamEventRepository {
  constructor(
    @InjectRepository(StreamEventEntity)
    private readonly repository: Repository<StreamEventEntity>,
  ) {}

  async save(event: StreamEvent): Promise<StreamEvent> {
    const saved = await this.repository.save(StreamEventMapper.toPersistence(event));
    return StreamEventMapper.toDomain(saved);
  }

  async findByStreamId(streamId: string): Promise<StreamEvent[]> {
    const entities = await this.repository.find({
      where: { streamId },
      order: { createdAt: 'DESC' },
    });

    return entities.map(StreamEventMapper.toDomain);
  }
}
