import { CallHandler, ExecutionContext, StreamableFile } from '@nestjs/common';
import { of, firstValueFrom } from 'rxjs';
import { HttpSuccessInterceptor } from './http-success.interceptor';

describe('HttpSuccessInterceptor', () => {
  it('reports the actual HTTP status with the default success message', async () => {
    const response = { statusCode: 201 };
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
        getResponse: () => response,
      }),
    } as ExecutionContext;
    const next = { handle: () => of({ id: 1 }) } as CallHandler;
    const output = await new HttpSuccessInterceptor().intercept(context, next);
    const result = await firstValueFrom(output);

    expect(result).toEqual({
      status_code: 201,
      data: { id: 1 },
      message: 'Success',
    });
  });

  it('uses the Vietnamese success message when requested', async () => {
    const response = { statusCode: 200 };
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'accept-language': 'vi-VN,vi;q=0.9' },
        }),
        getResponse: () => response,
      }),
    } as ExecutionContext;
    const next = { handle: () => of({ ok: true }) } as CallHandler;
    const output = await new HttpSuccessInterceptor().intercept(context, next);
    const result = await firstValueFrom(output);

    expect(result).toEqual({
      status_code: 200,
      data: { ok: true },
      message: 'Thành công',
    });
  });

  it('passes through a file response', async () => {
    const file = new StreamableFile(Buffer.from('image'));
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as ExecutionContext;
    const next = { handle: () => of(file) } as CallHandler;
    const output = await new HttpSuccessInterceptor().intercept(context, next);

    expect(await firstValueFrom(output)).toBe(file);
  });
});
