import { Injectable } from '@nestjs/common';
import { AUTH_TOPICS } from '@/infrastructure/kafka/kafka.constants';
import { KafkaGatewayService } from '@/infrastructure/kafka/kafka-gateway.service';
import {
  LoginInput,
  LogoutInput,
  GoogleCallbackInput,
  RefreshInput,
  RegisterInput,
  UpdateMeInput,
  UserScopedInput,
  VerifyEmailInput,
} from '../dto/auth.input';

@Injectable()
export class AuthUseCase {
  constructor(private readonly kafka: KafkaGatewayService) {}

  register(input: RegisterInput): Promise<unknown> {
    return this.kafka.request(AUTH_TOPICS.register, input);
  }

  login(input: LoginInput): Promise<unknown> {
    return this.kafka.request(AUTH_TOPICS.login, input);
  }

  refresh(input: RefreshInput): Promise<unknown> {
    return this.kafka.request(AUTH_TOPICS.refresh, input);
  }

  logout(input: LogoutInput): Promise<unknown> {
    return this.kafka.request(AUTH_TOPICS.logout, input);
  }

  me(input: UserScopedInput): Promise<unknown> {
    return this.kafka.request(AUTH_TOPICS.me, input);
  }

  updateMe(input: UpdateMeInput): Promise<unknown> {
    return this.kafka.request(AUTH_TOPICS.updateMe, input);
  }

  verifyEmail(input: VerifyEmailInput): Promise<unknown> {
    return this.kafka.request(AUTH_TOPICS.verifyEmail, input);
  }

  googleStart(): Promise<unknown> {
    return this.kafka.request(AUTH_TOPICS.googleStart, {});
  }

  googleCallback(input: GoogleCallbackInput): Promise<unknown> {
    return this.kafka.request(AUTH_TOPICS.googleCallback, input);
  }
}
