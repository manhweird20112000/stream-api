import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('/')
  getMsg() {
    return 'Hello World';
  }
}
