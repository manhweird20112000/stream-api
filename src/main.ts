import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { HttpExceptionFilter } from '@/shared/presentation/filters/http-exception.filter';
import { HttpSuccessInterceptor } from '@/shared/presentation/interceptors/http-success.interceptor';
import { RequestMethod, VersioningType } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IAdapterSecret } from '@/infrastructure/secret/adapter';
import { useContainer } from 'class-validator';
import compression from 'compression';
import { ValidationPipe } from '@/shared/presentation/validation/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  app.use(compression({ level: 1 }));

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  app.useGlobalPipes(new ValidationPipe());

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalInterceptors(new HttpSuccessInterceptor());

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  app.enableVersioning({ type: VersioningType.URI });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Stream API')
    .setDescription('HTTP API documentation for the Stream service.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const { APP_PORT, KAFKA_BROKERS, KAFKA_CLIENT_ID, KAFKA_GROUP_ID } =
    app.get(IAdapterSecret);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: KAFKA_CLIENT_ID,
        brokers: KAFKA_BROKERS,
      },
      consumer: {
        groupId: KAFKA_GROUP_ID,
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(APP_PORT);
}

bootstrap();
