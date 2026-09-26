import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthUserRepository } from '../../domain/ports/auth-user.repository';
import { CurrentUserResult } from './get-current-user.use-case';

export interface UpdateCurrentUserInput {
  displayName?: string | null;
  avatarUrl?: string | null;
}

@Injectable()
export class UpdateCurrentUserUseCase {
  constructor(private readonly users: AuthUserRepository) {}

  async execute(
    userId: string,
    input: UpdateCurrentUserInput,
  ): Promise<CurrentUserResult> {
    const user = await this.users.findById(userId);

    if (!user) {
      throw new UnauthorizedException();
    }

    const saved = await this.users.save({
      ...user,
      displayName:
        input.displayName === undefined ? user.displayName : this.clean(input.displayName),
      avatarUrl:
        input.avatarUrl === undefined ? user.avatarUrl : this.clean(input.avatarUrl),
    });

    return {
      id: saved.id,
      email: saved.email,
      displayName: saved.displayName,
      avatarUrl: saved.avatarUrl,
    };
  }

  private clean(value: string | null): string | null {
    if (value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
}
