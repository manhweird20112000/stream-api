import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuthRefreshToken,
  SavedAuthRefreshToken,
} from '../../../domain/auth-refresh-token';
import { AuthRefreshTokenRepository } from '../../../domain/ports/auth-refresh-token.repository';
import { AuthRefreshTokenEntity } from '../entities/auth-refresh-token.entity';
import { AuthRefreshTokenMapper } from '../mappers';

@Injectable()
export class TypeOrmAuthRefreshTokenRepository
  implements AuthRefreshTokenRepository
{
  constructor(
    @InjectRepository(AuthRefreshTokenEntity)
    private readonly repository: Repository<AuthRefreshTokenEntity>,
  ) {}

  async findByHash(tokenHash: string): Promise<SavedAuthRefreshToken | null> {
    const token = await this.repository.findOne({
      where: { tokenHash },
      relations: { user: true },
    });
    return token ? AuthRefreshTokenMapper.toDomain(token) : null;
  }

  async save(token: AuthRefreshToken): Promise<SavedAuthRefreshToken> {
    const saved = await this.repository.save(
      this.repository.create(AuthRefreshTokenMapper.toPersistence(token)),
    );
    return AuthRefreshTokenMapper.toDomain(saved);
  }
}
