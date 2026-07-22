import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

const DAILY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class StatcastScheduler implements OnModuleInit {
  private readonly log = new Logger(StatcastScheduler.name);

  constructor(
    @InjectQueue('statcast-ingest') private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    // Seed a repeating daily-refresh job; BullMQ deduplicates by jobId.
    await this.queue.add(
      'daily-refresh',
      { kind: 'daily-refresh' },
      {
        jobId: 'statcast-daily-refresh',
        repeat: { every: DAILY_MS },
        removeOnComplete: true,
      },
    );
    this.log.log('Statcast daily-refresh job registered');
  }
}
