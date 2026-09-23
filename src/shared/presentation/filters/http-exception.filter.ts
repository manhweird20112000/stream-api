import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): any {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof Error ? exception.message : 'Internal server error';

    const errors =
      exception instanceof HttpException &&
      status === HttpStatus.BAD_REQUEST &&
      typeof exception.getResponse() === 'object'
        ? (exception.getResponse() as { data?: unknown }).data ?? null
        : null;

    const errorResp = {
      status_code: status,
      message,
      data: errors,
    };

    return response.status(status).json(errorResp);
  }
}
