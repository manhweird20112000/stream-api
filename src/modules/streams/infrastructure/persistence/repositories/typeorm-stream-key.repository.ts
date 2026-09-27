import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StreamKeyStatus, type StreamKey } from '../../../domain/entities/stream-key';
import type { StreamKeyRepository } from '../../../domain/repositories/stream-key.repository';
import { StreamKeysEntity } from '../entities/stream-keys.entity';
import { StreamKeyMapper } from '../mappers/stream-key.mapper';

@Injectable()
export class TypeOrmStreamKeyRepository implements StreamKeyRepository {
  constructor(
    @InjectRepository(StreamKeysEntity)
    private readonly repository: Repository<StreamKeysEntity>,
  ) {}

  async save(streamKey: StreamKey): Promise<StreamKey> {
    const saved = await this.repository.save(
      StreamKeyMapper.toPersistence(streamKey),
    );
    return StreamKeyMapper.toDomain(saved);
  }

  async findById(id: string): Promise<StreamKey | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? StreamKeyMapper.toDomain(entity) : null;
  }

  async findActiveByOwnerUserId(ownerUserId: string): Promise<StreamKey | null> {
    const entity = await this.repository.findOne({
      where: { ownerUserId, status: StreamKeyStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    return entity ? StreamKeyMapper.toDomain(entity) : null;
  }

  async findActiveByKeyHash(keyHash: string): Promise<StreamKey | null> {
    const entity = await this.repository.findOne({
      where: { keyHash, status: StreamKeyStatus.ACTIVE },
    });

    return entity ? StreamKeyMapper.toDomain(entity) : null;
  }
}
