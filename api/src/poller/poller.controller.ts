// api/src/poller/poller.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { PollerProducer } from './poller.producer';

@Controller('poller')
export class PollerController {
  constructor(private readonly poller: PollerProducer) { }

  // Start or update a repeatable poll job
  @Get('enable')
  async enable(
    @Query('gameId') gameId: string,
    @Query('cadence') cadence: 'live' | 'warm' | 'cold' = 'warm',
  ) {
    return this.poller.upsertGamePoll(gameId, cadence);
  }

  // Optional: stop polling for a game
  @Get('disable')
  async disable(@Query('gameId') gameId: string) {
    return this.poller.removeGamePoll(gameId);
  }

  // Keep kickOnce for one-off debug if you still want it
  @Get('kick')
  async kick(@Query('gameId') gameId: string) {
    return this.poller.kickOnce(gameId);
  }
}