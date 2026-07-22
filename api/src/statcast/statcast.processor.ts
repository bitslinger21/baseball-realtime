import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import { StatcastService } from './statcast.service';

type IngestBatterJob = { mlbId: number; season: number };
type DailyRefreshJob = { kind: 'daily-refresh' };

@Processor('statcast-ingest', { concurrency: 1 })
@Injectable()
export class StatcastProcessor extends WorkerHost {
  private readonly log = new Logger(StatcastProcessor.name);

  constructor(
    private readonly svc: StatcastService,
    @InjectQueue('statcast-ingest') private readonly queue: Queue,
  ) {
    super();
  }

  async process(job: Job<IngestBatterJob | DailyRefreshJob>): Promise<void> {
    if (job.name === 'ingest-batter') {
      const { mlbId, season } = job.data as IngestBatterJob;
      await this.svc.ingestPlayer(mlbId, season);
    } else if (job.name === 'daily-refresh') {
      await this.runDailyRefresh();
    } else {
      this.log.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async runDailyRefresh(): Promise<void> {
    const summaries = await this.svc.getAllKnownSummaries();
    this.log.log(`Daily refresh: re-ingesting ${summaries.length} summaries`);
    for (const { mlbId, season } of summaries) {
      await this.queue.add(
        'ingest-batter',
        { mlbId, season },
        {
          jobId: `statcast-${mlbId}-${season}-refresh-${Date.now()}`,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }
  }
}
