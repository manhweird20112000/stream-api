import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StreamStatus, StreamVisibility } from '../../../domain/entities/stream';
import type { Stream } from '../../../domain/entities/stream';
import type {
  FindStreamsOptions,
  StreamRepository,
} from '../../../domain/repositories/stream.repository';
import { StreamEntity } from '../entities/stream.entity';
import { StreamMapper } from '../mappers/stream.mapper';

@Injectable()
export class TypeOrmStreamRepository implements StreamRepository {
  constructor(
    @InjectRepository(StreamEntity)
    private readonly repository: Repository<StreamEntity>,
  ) {}

  async save(stream: Stream): Promise<Stream> {
    const saved = await this.repository.save(StreamMapper.toPersistence(stream));
    return StreamMapper.toDomain(saved);
  }

  async findById(id: string): Promise<Stream | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? StreamMapper.toDomain(entity) : null;
  }

  async findByOwnerUserId(
    ownerUserId: string,
    options: FindStreamsOptions = {},
  ): Promise<Stream[]> {
    const query = this.repository
      .createQueryBuilder('stream')
      .where('stream.ownerUserId = :ownerUserId', { ownerUserId });

    if (options.status) {
      query.andWhere('stream.status = :status', { status: options.status });
    }

    if (options.cursor) {
      query.andWhere(
        '(stream.createdAt < :cursorCreatedAt OR (stream.createdAt = :cursorCreatedAt AND stream.id < :cursorId))',
        {
          cursorCreatedAt: options.cursor.createdAt,
          cursorId: options.cursor.id,
        },
      );
    }

    query.orderBy('stream.createdAt', 'DESC').addOrderBy('stream.id', 'DESC');

    if (options.limit !== undefined) {
      query.take(options.limit);
    }

    if (options.offset !== undefined) {
      query.skip(options.offset);
    }

    const entities = await query.getMany();

    return entities.map(StreamMapper.toDomain);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  async findPublicLive(options: FindStreamsOptions = {}): Promise<Stream[]> {
    const query = this.repository
      .createQueryBuilder('stream')
      .where('stream.status = :status', { status: StreamStatus.LIVE })
      .andWhere('stream.visibility = :visibility', {
        visibility: StreamVisibility.PUBLIC,
      });

    if (options.cursor) {
      query.andWhere(
        '(stream.createdAt < :cursorCreatedAt OR (stream.createdAt = :cursorCreatedAt AND stream.id < :cursorId))',
        {
          cursorCreatedAt: options.cursor.createdAt,
          cursorId: options.cursor.id,
        },
      );
    }

    query.orderBy('stream.createdAt', 'DESC').addOrderBy('stream.id', 'DESC');

    if (options.limit !== undefined) {
      query.take(options.limit);
    }

    if (options.offset !== undefined) {
      query.skip(options.offset);
    }

    const entities = await query.getMany();

    return entities.map(StreamMapper.toDomain);
  }
}
