// api/src/poller/poller.scheduler.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import { MlbApiService } from '../providers/mlb/mlb.service';

type PollerJobPayload = { gameId: string };

const toYmd = (d: Date): string => {
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
};

@Injectable()
export class PollerScheduler { //implements OnModuleInit {
  constructor(
    @InjectQueue('game-poller')
    private readonly pollerQueue: Queue,
    private readonly mlbService: MlbApiService,
  ) {
    this.log = new Logger(PollerScheduler.name);
  }

  private readonly log: Logger;

  async _onModuleInit(): Promise<void> {
    const today: string = this.getMlbTodayYmd();

    this.log.log(`Seeding poller jobs for games on ${today}`);

    // Same shape your GamesController uses
    const schedule = await this.mlbService.getScheduleByDate(today);

    if (schedule.length === 0) {
      this.log.warn(
        `No games returned for ${today}. Poller jobs not scheduled.`,
      );
      return;
    }

    let count = 0;

    for (const g of schedule) {
      // handle slightly different DTO shapes
      const providerGameId: string | undefined =
        (g as any).providerGameId ?? g.providerGameId;

      if (!providerGameId) {
        continue;
      }

      await this.pollerQueue.add(
        'poll-game',
        { gameId: providerGameId },
        {
          jobId: `poll-${providerGameId}`, // avoid dupes on restart
          repeat: {
            every: 15_000, // 15s
          },
          removeOnComplete: true,
          removeOnFail: true,
        },
      );

      count += 1;
    }

    this.log.log(`Scheduled poll jobs for ${count} games on ${today}`);
  }

  /** Use MLB's "today" in America/New_York rather than UTC */
  private getMlbTodayYmd(): string {
    const nowInEt = new Date(
      new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
      }),
    );
    return toYmd(nowInEt);
  }
}
