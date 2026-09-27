import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SecretModule } from '@/infrastructure/secret';
import { IAdapterSecret } from '@/infrastructure/secret/adapter';
import { JwtAuthGuard } from '@/shared/presentation/guards/jwt-auth.guard';
import { CreateStreamKeyUseCase } from './application/use-cases/create-stream-key.use-case';
import { CreateStreamUseCase } from './application/use-cases/create-stream.use-case';
import {
  DeleteStreamUseCase,
  EndStreamUseCase,
  GetStreamUseCase,
  ListPublicLiveStreamsUseCase,
  ListStreamsUseCase,
  PublishStreamUseCase,
  UpdateStreamUseCase,
} from './application/use-cases/stream-crud.use-cases';
import { VerifyStreamKeyUseCase } from './application/use-cases/verify-stream-key.use-case';
import { StreamsPersistenceModule } from './infrastructure/persistence/streams-persistence.module';
import { StreamsController } from './presentation/http/streams.controller';

@Module({
  imports: [
    StreamsPersistenceModule,
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
  providers: [
    CreateStreamUseCase,
    CreateStreamKeyUseCase,
    VerifyStreamKeyUseCase,
    ListStreamsUseCase,
    ListPublicLiveStreamsUseCase,
    GetStreamUseCase,
    UpdateStreamUseCase,
    PublishStreamUseCase,
    EndStreamUseCase,
    DeleteStreamUseCase,
    JwtAuthGuard,
  ],
})
export class StreamsModule {}
