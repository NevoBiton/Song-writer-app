import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    console.log('health check called'); // test PR flow
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
