import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser, SavedAuthUser } from '../../../domain/auth-user';
import { AuthUserRepository } from '../../../domain/ports/auth-user.repository';
import { UserEntity } from '../entities/user.entity';
import { AuthUserMapper } from '../mappers';

@Injectable()
export class TypeOrmAuthUserRepository implements AuthUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<SavedAuthUser | null> {
    const user = await this.repository.findOne({ where: { id } });
    return user ? AuthUserMapper.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<SavedAuthUser | null> {
    const user = await this.repository.findOne({ where: { email } });
    return user ? AuthUserMapper.toDomain(user) : null;
  }

  async save(user: AuthUser): Promise<SavedAuthUser> {
    const saved = await this.repository.save(
      this.repository.create(AuthUserMapper.toPersistence(user)),
    );
    return AuthUserMapper.toDomain(saved);
  }
}
