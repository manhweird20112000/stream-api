import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { StreamSession } from '../../../domain/entities/stream-session';
import type { StreamSessionRepository } from '../../../domain/repositories/stream-session.repository';
import { StreamSessionEntity } from '../entities/stream-session.entity';
import { StreamSessionMapper } from '../mappers/stream-session.mapper';

@Injectable()
export class TypeOrmStreamSessionRepository implements StreamSessionRepository {
  constructor(
    @InjectRepository(StreamSessionEntity)
    private readonly repository: Repository<StreamSessionEntity>,
  ) {}

  async save(session: StreamSession): Promise<StreamSession> {
    const saved = await this.repository.save(
      StreamSessionMapper.toPersistence(session),
    );
    return StreamSessionMapper.toDomain(saved);
  }

  async findById(id: string): Promise<StreamSession | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? StreamSessionMapper.toDomain(entity) : null;
  }

  async findByStreamId(streamId: string): Promise<StreamSession[]> {
    const entities = await this.repository.find({
      where: { streamId },
      order: { createdAt: 'DESC' },
    });

    return entities.map(StreamSessionMapper.toDomain);
  }
}
