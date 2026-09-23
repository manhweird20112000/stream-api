import { CallHandler, ExecutionContext, StreamableFile } from '@nestjs/common';
import { of, firstValueFrom } from 'rxjs';
import { HttpSuccessInterceptor } from './http-success.interceptor';

describe('HttpSuccessInterceptor', () => {
  it('reports the actual HTTP status', async () => {
    const response = { statusCode: 201 };
    const context = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as ExecutionContext;
    const next = { handle: () => of({ id: 1 }) } as CallHandler;
    const output = await new HttpSuccessInterceptor().intercept(context, next);
    const result = await firstValueFrom(output);

    expect(result).toEqual({
      status_code: 201,
      data: { id: 1 },
      message: 'Successfully.',
    });
  });

  it('passes through a file response', async () => {
    const file = new StreamableFile(Buffer.from('image'));
    const context = {
      switchToHttp: () => ({ getResponse: () => ({ statusCode: 200 }) }),
    } as ExecutionContext;
    const next = { handle: () => of(file) } as CallHandler;
    const output = await new HttpSuccessInterceptor().intercept(context, next);

    expect(await firstValueFrom(output)).toBe(file);
  });
});
