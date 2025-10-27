import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class PollerProducer {
  private readonly log = new Logger(PollerProducer.name);
  constructor(@InjectQueue('game-poller') private readonly queue: Queue) {}

  private makeJobId(gameId: string) {
    return `poll_${gameId}`; // no colon allowed in BullMQ v5
  }

  /** Create or replace a repeatable polling job */
  async upsertGamePoll(gameId: string, cadence: 'live'|'warm'|'cold' = 'warm') {
    const intervals = { live: 3_000, warm: 10_000, cold: 60_000 } as const;
    const every = intervals[cadence];
    const jobId = this.makeJobId(gameId);

    await this.queue.add(
      'poll',
      { gameId },
      {
        repeat: { every, jobId },
        jobId,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );

    this.log.log(`Scheduled ${jobId} (${cadence}) every ${every}ms`);
    return { ok: true, gameId, cadence, every };
  }

  /** Stop polling for one game */
  async removeGamePoll(gameId: string) {
    const jobId = this.makeJobId(gameId);
    const repeat = await this.queue.repeat;
    const items = await repeat.getRepeatableJobs();
    for (const r of items) {
      if (r.id === jobId && r.name === 'poll') {
await repeat.removeRepeatable('poll', { every: Number(r.every) || undefined }, r.id);      }
    }
    return { ok: true, removed: gameId };
  }
  // async removeGamePoll(gameId: string) {
  //   const jobId = this.makeJobId(gameId);
  //   for await (const r of this.queue.getRepeatableJobsIterator()) {
  //     if (r.id === jobId && r.name === 'poll') {
  //       await this.queue.removeRepeatable('poll', { every: r.every }, r.id);
  //       this.log.log(`Removed repeatable job ${r.id}`);
  //     }
  //   }
  //   return { ok: true, removed: gameId };
  // }

  /** List all repeatable polling jobs */
  async listRepeatableJobs() {
    // Deprecated in docs but still supported & typed on many installs
    const repeat = await this.queue.repeat;
    const items = await repeat.getRepeatableJobs();
    return items.map(r => ({
      id: r.id,
      every: r.every,
      next: r.next,
      key: r.key,
      name: r.name,
    }));
  }
  // async listRepeatableJobs() {
  //   const jobs: any[] = [];
  //   for await (const r of this.queue.getRepeatableJobsIterator()) {
  //     jobs.push({ id: r.id, every: r.every, next: r.next, key: r.key });
  //   }
  //   return jobs;
  // }

  /** Fire a one-off poll immediately (for debugging) */
  async kickOnce(gameId: string) {
    await this.queue.add('poll', { gameId }, { removeOnComplete: true });
    this.log.log(`Kicked one-off poll for ${gameId}`);
    return { ok: true, gameId };
  }
}

// import { Injectable } from '@nestjs/common';
// import { InjectQueue } from '@nestjs/bullmq';
// import { Queue } from 'bullmq';

// export type PollCadence = 'cold' | 'warm' | 'live';
// const cadenceMs: Record<PollCadence, number> = { cold: 60_000, warm: 10_000, live: 3_000 };
// const jobId = (gameId: string) => `poll_${gameId}`; // <-- no colon

// @Injectable()
// export class PollerProducer {
//   constructor(
//     @InjectQueue('game-poller') private readonly queue: Queue
//   ) {}

//   async upsertGamePoll(gameId: string, cadence: PollCadence = 'warm') {
//     const repeatEvery = cadenceMs[cadence];
//     // use a deterministic jobId so re-adding updates cadence instead of duplicating
//     await this.queue.add(
//       'poll',
//       { gameId },
//       {
//         jobId: jobId(gameId),
//         repeat: { every: repeatEvery },
//         removeOnComplete: true,
//         removeOnFail: 100,
//         backoff: { type: 'exponential', delay: 1000 },
//       },
//     );
//   }

//   async removeGamePoll(gameId: string) {
//     // safest: remove all repeats for that jobId across cadences
//     const repeats = await this.queue.getRepeatableJobs();
//     await Promise.all(
//       repeats
//         .filter(r => r.id === jobId(gameId))           // <-- match by id
//         .map(r => this.queue.removeRepeatableByKey(r.key))
//     );
//     return { ok: true };
//   }
// }
