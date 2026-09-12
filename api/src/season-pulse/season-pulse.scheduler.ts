import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

const DAILY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SeasonPulseScheduler implements OnModuleInit {
  private readonly log = new Logger(SeasonPulseScheduler.name);

  constructor(@InjectQueue('season-pulse') private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    // Seed a repeating daily-refresh job; BullMQ deduplicates by jobId.
    await this.queue.add(
      'compute-all',
      { kind: 'compute-all' },
      {
        jobId: 'season-pulse-daily-refresh',
        repeat: { every: DAILY_MS },
        removeOnComplete: true,
      },
    );
    this.log.log('Season pulse daily-refresh job registered');
  }
}
