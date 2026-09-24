import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '@/shared/presentation/guards/jwt-auth.guard';
import { CreateStreamUseCase } from '../../application/use-cases/create-stream.use-case';
import { CreateStreamRequest } from './dto/create-stream.request';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
  };
}

@Controller('streams')
export class StreamsController {
  constructor(private readonly createStream: CreateStreamUseCase) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() body: CreateStreamRequest,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.createStream.execute({
      userId: request.user.sub,
      title: body.title,
      description: body.description,
    });
  }
}
