import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

const SUCCESS_MESSAGES = {
  en: 'Success',
  vi: 'Thành công',
} as const;

type SupportedLocale = keyof typeof SUCCESS_MESSAGES;

@Injectable()
export class HttpSuccessInterceptor<T> implements NestInterceptor<T, any> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<any> | Promise<Observable<any>> {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof StreamableFile) {
          return data;
        }
        const statusCode = context.switchToHttp().getResponse().statusCode;
        const request = context.switchToHttp().getRequest();
        const locale = this.resolveLocale(request.headers?.['accept-language']);

        return {
          status_code: statusCode,
          data: data,
          message: SUCCESS_MESSAGES[locale],
        };
      }),
    );
  }

  private resolveLocale(acceptLanguage: unknown): SupportedLocale {
    const header = Array.isArray(acceptLanguage)
      ? acceptLanguage.join(',')
      : String(acceptLanguage ?? '');

    return header
      .split(',')
      .map((language) => language.trim().split(';')[0]?.toLowerCase())
      .some((language) => language === 'vi' || language?.startsWith('vi-'))
      ? 'vi'
      : 'en';
  }
}
