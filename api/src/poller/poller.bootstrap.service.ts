// api/src/poller/poller.bootstrap.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import { MlbApiService } from 'src/providers/mlb/mlb.service';

const toYmd = (d: Date): string => {
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
};

@Injectable()
export class PollerBootstrapService implements OnModuleInit {
  private readonly log = new Logger(PollerBootstrapService.name);

  public constructor(
    @InjectQueue('game-poller')
    private readonly pollerQueue: Queue<{ gameId: string }>,
    private readonly mlbService: MlbApiService,
  ) { }

  public async onModuleInit(): Promise<void> {
    const today: string = toYmd(new Date());

    this.log.log(`Seeding poller jobs for games on ${today}`);

    // Same schedule that GamesController uses
    const schedule = await this.mlbService.getScheduleByDate(today);

    let count = 0;

    for (const g of schedule) {
      // GameDto from the SDK should already have providerGameId
      const providerGameId: string | undefined =
        (g as any).providerGameId ?? g.providerGameId;

      if (!providerGameId) {
        continue;
      }

      await this.pollerQueue.add(
        'poll-game',
        { gameId: providerGameId },
        {
          jobId: `poll-${providerGameId}`, // repeatable, one per game
          repeat: {
            every: 15_000, // 15s – tweak as you like
          },
          removeOnComplete: true,
          removeOnFail: true,
        },
      );

      count += 1;
    }

    this.log.log(`Scheduled poll jobs for ${count} games on ${today}`);
  }
}
