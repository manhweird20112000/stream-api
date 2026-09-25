import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthUserRepository } from '../../domain/ports/auth-user.repository';

export interface CurrentUserResult {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class GetCurrentUserUseCase {
  constructor(private readonly users: AuthUserRepository) {}

  async execute(userId: string): Promise<CurrentUserResult> {
    const user = await this.users.findById(userId);

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };
  }
}

