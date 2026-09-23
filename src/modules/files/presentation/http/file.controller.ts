import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetPrivateFileUseCase } from '../../application/use-cases/get-private-file.use-case';
import { UploadFileUseCase } from '../../application/use-cases/upload-file.use-case';
import { FileNotFoundError } from '../../domain/errors/file-not-found.error';
import { parseFileVisibility } from '../../domain/value-objects/file-visibility';
import { UploadFileRequest } from './dto/upload-file.request';
import { FileRequest, JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FileController {
  constructor(
    private readonly uploadFile: UploadFileUseCase,
    private readonly getPrivateFile: GetPrivateFileUseCase,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1024 * 1024 } }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: FileRequest,
    @Body() body: UploadFileRequest,
  ) {
    if (!file) throw new BadRequestException('File is required');

    try {
      return await this.uploadFile.execute({
        file,
        ownerId: request.userId!,
        visibility: parseFileVisibility(body.visibility ?? 'private'),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        ['Invalid file visibility', 'Unsupported image type', 'Image exceeds maximum size'].includes(error.message)
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  async privateFile(
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
    @Req() request: FileRequest,
  ): Promise<StreamableFile> {
    try {
      const file = await this.getPrivateFile.execute({
        id,
        userId: request.userId!,
      });
      return new StreamableFile(file.stream, {
        type: file.contentType,
        length: file.contentLength,
      });
    } catch (error) {
      if (error instanceof FileNotFoundError || (error instanceof Error && error.message === 'File not found')) {
        throw new NotFoundException('File not found');
      }
      throw error;
    }
  }
}
