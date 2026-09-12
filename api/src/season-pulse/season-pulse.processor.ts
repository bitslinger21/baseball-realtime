import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { SeasonPulseService } from './season-pulse.service';

type ComputeAllJob = { kind: 'compute-all' };

@Processor('season-pulse', { concurrency: 1 })
@Injectable()
export class SeasonPulseProcessor extends WorkerHost {
  private readonly log = new Logger(SeasonPulseProcessor.name);

  constructor(private readonly svc: SeasonPulseService) {
    super();
  }

  async process(job: Job<ComputeAllJob>): Promise<void> {
    if (job.name === 'compute-all') {
      await this.svc.computeAndPersistAll();
    } else {
      this.log.warn(`Unknown job name: ${job.name}`);
    }
  }
}
