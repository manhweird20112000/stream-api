import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '@/shared/presentation/guards/jwt-auth.guard';
import {
  buildCursorPaginatedResponse,
  CursorPaginatedResponse,
  CursorPaginationQueryDto,
  decodeCursor,
  getCursorPaginationParams,
} from '@/shared/presentation/pagination';
import { CreateStreamKeyUseCase } from '../../application/use-cases/create-stream-key.use-case';
import { CreateStreamUseCase } from '../../application/use-cases/create-stream.use-case';
import {
  DeleteStreamUseCase,
  EndStreamUseCase,
  GetStreamUseCase,
  ListPublicLiveStreamsUseCase,
  ListStreamsUseCase,
  PublishStreamUseCase,
  UpdateStreamUseCase,
} from '../../application/use-cases/stream-crud.use-cases';
import { VerifyStreamKeyUseCase } from '../../application/use-cases/verify-stream-key.use-case';
import { CreateStreamRequest } from './dto/create-stream.request';
import { PublishStreamRequest } from './dto/publish-stream.request';
import { StreamKeyResponse } from './dto/stream-key.response';
import { StreamResponse } from './dto/stream.response';
import { UpdateStreamRequest } from './dto/update-stream.request';
import { VerifyStreamKeyRequest } from './dto/verify-stream-key.request';
import { VerifyStreamKeyResponse } from './dto/verify-stream-key.response';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
  };
}

@Controller('streams')
export class StreamsController {
  constructor(
    private readonly createStream: CreateStreamUseCase,
    private readonly createStreamKey: CreateStreamKeyUseCase,
    private readonly verifyStreamKey: VerifyStreamKeyUseCase,
    private readonly listStreams: ListStreamsUseCase,
    private readonly listPublicLiveStreams: ListPublicLiveStreamsUseCase,
    private readonly getStream: GetStreamUseCase,
    private readonly updateStream: UpdateStreamUseCase,
    private readonly publishStream: PublishStreamUseCase,
    private readonly endStream: EndStreamUseCase,
    private readonly deleteStream: DeleteStreamUseCase,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() body: CreateStreamRequest,
    @Req() request: AuthenticatedRequest,
  ): Promise<StreamResponse> {
    const stream = await this.createStream.execute({
      userId: request.user.sub,
      title: body.title,
      description: body.description,
      thumbnailUrl: body.thumbnailUrl,
      visibility: body.visibility,
    });

    return StreamResponse.fromDomain(stream);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @Query() query: CursorPaginationQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<CursorPaginatedResponse<StreamResponse>> {
    const pagination = getCursorPaginationParams(query);
    const decodedCursor = query.cursor ? decodeCursor(query.cursor) : null;
    const streams = await this.listStreams.execute({
      ownerUserId: request.user.sub,
      limit: pagination.take,
      cursor: decodedCursor
        ? {
            createdAt: new Date(decodedCursor.createdAt),
            id: String(decodedCursor.id),
          }
        : undefined,
    });
    const items = streams.map(StreamResponse.fromDomain);
    const response = buildCursorPaginatedResponse(
      items as unknown as Array<Record<string, unknown>>,
      query,
    );

    return {
      items: response.items as unknown as StreamResponse[],
      meta: response.meta,
    };
  }

  @Get('live')
  async listLive(
    @Query() query: CursorPaginationQueryDto,
  ): Promise<CursorPaginatedResponse<StreamResponse>> {
    const pagination = getCursorPaginationParams(query);
    const decodedCursor = query.cursor ? decodeCursor(query.cursor) : null;
    const streams = await this.listPublicLiveStreams.execute({
      limit: pagination.take,
      cursor: decodedCursor
        ? {
            createdAt: new Date(decodedCursor.createdAt),
            id: String(decodedCursor.id),
          }
        : undefined,
    });
    const items = streams.map(StreamResponse.fromDomain);
    const response = buildCursorPaginatedResponse(
      items as unknown as Array<Record<string, unknown>>,
      query,
    );

    return {
      items: response.items as unknown as StreamResponse[],
      meta: response.meta,
    };
  }

  @Post('keys')
  @UseGuards(JwtAuthGuard)
  async generateKey(
    @Req() request: AuthenticatedRequest,
  ): Promise<StreamKeyResponse> {
    await this.createStreamKey.execute({
      ownerUserId: request.user.sub,
    });

    return StreamKeyResponse.ok();
  }

  @Post('keys/refresh')
  @UseGuards(JwtAuthGuard)
  async refreshKey(
    @Req() request: AuthenticatedRequest,
  ): Promise<StreamKeyResponse> {
    await this.createStreamKey.execute({
      ownerUserId: request.user.sub,
      refresh: true,
    });

    return StreamKeyResponse.ok();
  }

  @Post('keys/verify')
  @HttpCode(200)
  async verifyKey(
    @Body() body: VerifyStreamKeyRequest,
  ): Promise<VerifyStreamKeyResponse> {
    return this.verifyStreamKey.execute({ streamKey: body.streamKey });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async get(
    @Param('id') streamId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<StreamResponse> {
    const stream = await this.getStream.execute({
      ownerUserId: request.user.sub,
      streamId,
    });

    return StreamResponse.fromDomain(stream);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') streamId: string,
    @Body() body: UpdateStreamRequest,
    @Req() request: AuthenticatedRequest,
  ): Promise<StreamResponse> {
    const stream = await this.updateStream.execute({
      ownerUserId: request.user.sub,
      streamId,
      title: body.title,
      description: body.description,
      thumbnailUrl: body.thumbnailUrl,
      visibility: body.visibility,
    });

    return StreamResponse.fromDomain(stream);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async publish(
    @Param('id') streamId: string,
    @Body() body: PublishStreamRequest,
    @Req() request: AuthenticatedRequest,
  ): Promise<StreamResponse> {
    const stream = await this.publishStream.execute({
      ownerUserId: request.user.sub,
      streamId,
      publisherIp: body.publisherIp,
    });

    return StreamResponse.fromDomain(stream);
  }

  @Post(':id/end')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async end(
    @Param('id') streamId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<StreamResponse> {
    const stream = await this.endStream.execute({
      ownerUserId: request.user.sub,
      streamId,
    });

    return StreamResponse.fromDomain(stream);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async delete(
    @Param('id') streamId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    await this.deleteStream.execute({
      ownerUserId: request.user.sub,
      streamId,
    });
  }
}
