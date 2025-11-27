// src/realtime/realtime.controller.ts
import { Controller, Post, Body, Get } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Controller('realtime')
export class RealtimeController {
  constructor(private readonly gw: RealtimeGateway) { }

  @Get('ping')
  ping() {
    return { ok: true };
  }

  @Post('test')
  sendTest(@Body() body: { gameId: string; msg: string }) {
    this.gw.publishGameUpdate(body.gameId, { play: { msg: body.msg, ts: new Date().toISOString() } as any });
    return { ok: true };
  }
}
