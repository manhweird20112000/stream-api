import { ArgumentsHost } from '@nestjs/common';
import {
  KafkaGatewayDownstreamError,
  KafkaGatewayTimeoutError,
} from '@/infrastructure/kafka/kafka.errors';
import { HttpExceptionFilter } from './http-exception.filter';

function createHost() {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
}

describe('HttpExceptionFilter', () => {
  it('maps Kafka timeouts to a stable gateway timeout response', () => {
    const { host, response } = createHost();

    new HttpExceptionFilter().catch(new KafkaGatewayTimeoutError(), host);

    expect(response.status).toHaveBeenCalledWith(504);
    expect(response.json).toHaveBeenCalledWith({
      status_code: 504,
      message: 'Downstream service timed out',
      data: { code: 'DOWNSTREAM_TIMEOUT' },
    });
  });

  it('maps Kafka downstream errors without exposing raw downstream messages', () => {
    const { host, response } = createHost();

    new HttpExceptionFilter().catch(
      new KafkaGatewayDownstreamError('STREAM_LIMIT_REACHED', 'internal stack'),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(502);
    expect(response.json).toHaveBeenCalledWith({
      status_code: 502,
      message: 'Downstream service error',
      data: { code: 'STREAM_LIMIT_REACHED' },
    });
    expect(JSON.stringify(response.json.mock.calls[0][0])).not.toContain(
      'internal stack',
    );
  });
});
