import { Injectable } from '@nestjs/common';
import { BaseUseCase } from '@/shared/common/base-use-case';
import { IUserRepository } from '../ports/user.repository.port';
import { User } from '@/modules/user/domain/user.entity';

interface Input {
  email: string;
}

interface Output {
  id: string;
  email: string;
}

@Injectable()
export class GetUserUseCase implements BaseUseCase<Input, Output> {
  constructor(
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: Input): Promise<Output> {
    const user = await this.userRepository.findByEmail(input.email);
    
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id.toString(),
      email: user.email,
    };
  }
}
