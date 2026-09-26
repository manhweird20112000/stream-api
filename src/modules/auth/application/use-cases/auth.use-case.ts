import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AUTH_TOPICS } from '@/infrastructure/kafka/kafka.constants';
import { KafkaGatewayService } from '@/infrastructure/kafka/kafka-gateway.service';
import {
  LoginInput,
  RefreshInput,
  RegisterInput,
  UserScopedInput,
} from '../dto/auth.input';

@Injectable()
export class AuthUseCase {
  constructor(private readonly kafka: KafkaGatewayService) {}

  register(input: RegisterInput): Promise<unknown> {
    return this.command('auth.register', input);
  }

  login(input: LoginInput): Promise<unknown> {
    return this.command('auth.login', input);
  }

  refresh(input: RefreshInput): Promise<unknown> {
    return this.command('auth.refresh', input);
  }

  logout(input: UserScopedInput): Promise<unknown> {
    return this.command('auth.logout', {}, input.userId);
  }

  me(input: UserScopedInput): Promise<unknown> {
    return this.command('auth.me', {}, input.userId);
  }

  private command<TPayload>(
    type: string,
    payload: TPayload,
    userId?: string,
  ): Promise<unknown> {
    return this.kafka.request(AUTH_TOPICS.commands, {
      requestId: randomUUID(),
      userId,
      type,
      payload,
    });
  }
}

