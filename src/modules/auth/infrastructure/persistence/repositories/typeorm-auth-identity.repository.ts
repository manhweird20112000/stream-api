import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthIdentity } from '../../../domain/auth-identity';
import { AuthProvider } from '../../../domain/auth-provider';
import { AuthIdentityRepository } from '../../../domain/ports/auth-identity.repository';
import { AuthIdentityEntity } from '../entities/auth-identity.entity';
import { AuthIdentityMapper } from '../mappers';

@Injectable()
export class TypeOrmAuthIdentityRepository implements AuthIdentityRepository {
  constructor(
    @InjectRepository(AuthIdentityEntity)
    private readonly repository: Repository<AuthIdentityEntity>,
  ) {}

  async findByProvider(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<AuthIdentity | null> {
    const identity = await this.repository.findOne({
      where: { provider, providerUserId },
      relations: { user: true },
    });
    return identity ? AuthIdentityMapper.toDomain(identity) : null;
  }

  async findByUserAndProvider(
    userId: string,
    provider: AuthProvider,
  ): Promise<AuthIdentity | null> {
    const identity = await this.repository.findOne({
      where: { userId, provider },
    });
    return identity ? AuthIdentityMapper.toDomain(identity) : null;
  }

  async save(identity: AuthIdentity): Promise<AuthIdentity> {
    const saved = await this.repository.save(
      this.repository.create(AuthIdentityMapper.toPersistence(identity)),
    );
    return AuthIdentityMapper.toDomain(saved);
  }
}
