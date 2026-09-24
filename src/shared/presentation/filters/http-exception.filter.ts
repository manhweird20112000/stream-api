import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  KafkaGatewayDownstreamError,
  KafkaGatewayTimeoutError,
} from '@/infrastructure/kafka/kafka.errors';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): any {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof KafkaGatewayTimeoutError) {
      return response.status(HttpStatus.GATEWAY_TIMEOUT).json({
        status_code: HttpStatus.GATEWAY_TIMEOUT,
        message: 'Downstream service timed out',
        data: { code: 'DOWNSTREAM_TIMEOUT' },
      });
    }

    if (exception instanceof KafkaGatewayDownstreamError) {
      return response.status(HttpStatus.BAD_GATEWAY).json({
        status_code: HttpStatus.BAD_GATEWAY,
        message: 'Downstream service error',
        data: { code: exception.code },
      });
    }

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
        ? ((exception.getResponse() as { data?: unknown }).data ?? null)
        : null;

    const errorResp = {
      status_code: status,
      message,
      data: errors,
    };

    return response.status(status).json(errorResp);
  }
}
