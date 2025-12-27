import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class PollerProducer {
  private readonly log = new Logger(PollerProducer.name);
  private readonly enabledGameIds = new Set<string>();

  constructor(@InjectQueue('game-poller') private readonly queue: Queue) { }

  private makeJobId(gameId: string) {
    return `poll_${gameId}`; // no colon allowed in BullMQ v5
  }

  /** Create or replace a repeatable polling job */
  async upsertGamePoll(
    gameId: string,
    cadence: 'live' | 'warm' | 'cold' = 'warm',
  ) {
    const intervals = { live: 3_000, warm: 10_000, cold: 60_000 } as const;
    const every = intervals[cadence];
    const jobId = this.makeJobId(gameId);

    if (!this.isEnabled(gameId)) return;
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
        await repeat.removeRepeatable(
          'poll',
          { every: Number(r.every) || undefined },
          r.id,
        );
      }
    }
    return { ok: true, removed: gameId };
  }

  /** List all repeatable polling jobs */
  async listRepeatableJobs() {
    // Deprecated in docs but still supported & typed on many installs
    const repeat = await this.queue.repeat;
    const items = await repeat.getRepeatableJobs();
    return items.map((r) => ({
      id: r.id,
      every: r.every,
      next: r.next,
      key: r.key,
      name: r.name,
    }));
  }

  /** Fire a one-off poll immediately (for debugging) */
  async kickOnce(gameId: string) {

    if (!this.isEnabled(gameId)) { return };
    await this.queue.add('poll', { gameId }, { removeOnComplete: true });
    this.log.log(`Kicked one-off poll for ${gameId}`);
    return { ok: true, gameId };
  }

  public enableGame(gameId: string): void {
    this.enabledGameIds.add(gameId);
  }

  public disableGame(gameId: string): void {
    this.enabledGameIds.delete(gameId);
  }

  private isEnabled(gameId: string): boolean {
    return this.enabledGameIds.has(gameId);
  }
}


