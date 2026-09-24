import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { KafkaModule } from '@/infrastructure/kafka/kafka.module';
import { SecretModule } from '@/infrastructure/secret';
import { IAdapterSecret } from '@/infrastructure/secret/adapter';
import { JwtAuthGuard } from '@/shared/presentation/guards/jwt-auth.guard';
import { CreateStreamUseCase } from './application/use-cases/create-stream.use-case';
import { StreamsController } from './presentation/http/streams.controller';

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
  controllers: [StreamsController],
  providers: [CreateStreamUseCase, JwtAuthGuard],
})
export class StreamsModule {}
