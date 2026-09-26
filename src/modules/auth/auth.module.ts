import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { KafkaModule } from '@/infrastructure/kafka/kafka.module';
import { SecretModule } from '@/infrastructure/secret';
import { IAdapterSecret } from '@/infrastructure/secret/adapter';
import { JwtAuthGuard } from '@/shared/presentation/guards/jwt-auth.guard';
import { AuthUseCase } from './application/use-cases/auth.use-case';
import { AuthController } from './presentation/http/auth.controller';

@Module({
  imports: [
    KafkaModule,
    JwtModule.registerAsync({
      imports: [SecretModule],
      inject: [IAdapterSecret],
      useFactory: (secrets: IAdapterSecret) => ({
        secret: secrets.JWT_SECRET,
        signOptions: { expiresIn: secrets.TOKEN_EXPIRATION },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthUseCase, JwtAuthGuard],
})
export class AuthModule {}

