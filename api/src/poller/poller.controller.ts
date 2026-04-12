import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PollerProducer } from './poller.producer';
import { GameMeta, PollerService } from './poller.service';

@Controller('poller')
export class PollerController {
  constructor(
    private readonly poller: PollerProducer,
    private readonly pollerService: PollerService,
  ) { }

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
  @Post('kick/:gameId')
  async kickOnce(
    @Param('gameId') gameId: string,
  ) {
    return this.poller.kickOnce(gameId);
  }

  @Get(':gameId/meta')
  public async getGameMeta(@Param('gameId') gameId: string): Promise<GameMeta> {
    return this.pollerService.fetchGameMeta(gameId);
  }
}