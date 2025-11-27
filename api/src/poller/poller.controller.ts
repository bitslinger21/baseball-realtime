import { Controller, Post, Get, Body } from '@nestjs/common';
import { PollerProducer } from './poller.producer';

@Controller('poller')
export class PollerController {
  constructor(private readonly producer: PollerProducer) { }

  @Post('start')
  start(@Body() body: { gameId: string; cadence?: 'live' | 'warm' | 'cold' }) {
    return this.producer.upsertGamePoll(body.gameId, body.cadence);
  }

  @Post('stop')
  stop(@Body() body: { gameId: string }) {
    return this.producer.removeGamePoll(body.gameId);
  }

  @Get('debug/repeat')
  list() {
    return this.producer.listRepeatableJobs();
  }

  @Post('kick')
  kick(@Body() body: { gameId: string }) {
    return this.producer.kickOnce(body.gameId);
  }
}
