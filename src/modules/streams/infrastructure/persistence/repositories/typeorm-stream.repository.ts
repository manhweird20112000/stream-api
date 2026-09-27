import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    const entities = await this.repository.find({
      where: {
        ownerUserId,
        ...(options.status ? { status: options.status } : {}),
      },
      order: { createdAt: 'DESC' },
      take: options.limit,
      skip: options.offset,
    });

    return entities.map(StreamMapper.toDomain);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }
}
