import { Controller, Post, Get, Body } from '@nestjs/common';
import { PollerProducer } from './poller.producer';

@Controller('poller')
export class PollerController {
  constructor(private readonly producer: PollerProducer) {}

  @Post('start')
  start(@Body() body: { gameId: string; cadence?: 'live'|'warm'|'cold' }) {
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
// import { Body, Controller, Get, Post } from '@nestjs/common';
// import { PollerProducer } from './poller.producer';
// import { InjectQueue } from '@nestjs/bullmq';
// import { Queue } from 'bullmq';

// @Controller('poller')
// export class PollerController {
//   constructor(
//     private readonly producer: PollerProducer,
//     @InjectQueue('game-poller') private readonly queue: Queue,
// ) {}

// @Get('debug/repeat')
// async listRepeat() {
//   const items = await this.queue.getRepeatableJobs();
//   return items.map(i => ({ key: i.key, every: i.every, next: i.next, name: i.name }));
// }


//   @Post('start')
//   start(@Body() body: { gameId: string; cadence?: 'cold' | 'warm' | 'live' }) {
//     return this.producer.upsertGamePoll(body.gameId, body.cadence ?? 'live').then(() => ({ ok: true }));
//   }

//   @Post('stop')
//   stop(@Body() body: { gameId: string }) {
//     return this.producer.removeGamePoll(body.gameId).then(() => ({ ok: true }));
//   }

//   @Post('kick')
//   async kick(@Body() body: { gameId: string }) {
//     await this.queue.add('poll', { gameId: body.gameId }, { jobId: `kick:${body.gameId}`, removeOnComplete: true });
//     return { ok: true };
//   }
// }
