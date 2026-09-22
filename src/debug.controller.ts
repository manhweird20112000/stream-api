import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';

@Controller('debug')
export class DebugController {
  @Get('block-event-loop')
  blockEventLoop(
    @Query('durationMs', new DefaultValuePipe(1000), ParseIntPipe)
    durationMs = 1000,
  ) {
    if (durationMs < 1 || durationMs > 10000) {
      throw new BadRequestException('durationMs must be between 1 and 10000');
    }

    const startedAt = Date.now();
    const deadline = startedAt + durationMs;

    while (Date.now() < deadline) {}

    return {
      requestedDurationMs: durationMs,
      elapsedDurationMs: Date.now() - startedAt,
    };
  }
}
