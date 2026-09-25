import { ArgumentsHost, BadRequestException } from '@nestjs/common';
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
  it('maps validation errors to a stable bad request response', () => {
    const { host, response } = createHost();

    new HttpExceptionFilter().catch(
      new BadRequestException({
        message: 'Validation failed',
        data: [{ property: 'email', constraints: ['email must be valid'] }],
      }),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      status_code: 400,
      message: 'Validation failed',
      data: [{ property: 'email', constraints: ['email must be valid'] }],
    });
  });
});
