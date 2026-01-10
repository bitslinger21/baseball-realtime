import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue, RepeatableJob } from 'bullmq';

type Cadence = 'live' | 'warm' | 'cold';

type RepeatableJobView = {
  id: string | null;
  name: string;
  every: number | null;
  next: number | null;
  key: string;
};

type RedisHashClient = {
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<number>;
  hdel(key: string, field: string): Promise<number>;
};

const REPEAT_KEY_HASH = 'baseball:game-poller:repeatKeyByGameId';

@Injectable()
export class PollerProducer {
  private readonly log: Logger = new Logger(PollerProducer.name);
  private readonly enabledGameIds: Set<string> = new Set<string>();
  private readonly repeatKeyByGameId: Map<string, string> = new Map();

  public constructor(@InjectQueue('game-poller') private readonly queue: Queue) { }

  private async getRedis(): Promise<RedisHashClient> {
    const client: unknown = await this.queue.client;
    return client as RedisHashClient;
  }

  private async persistRepeatKey(gameId: string, repeatKey: string): Promise<void> {
    this.repeatKeyByGameId.set(gameId, repeatKey);
    const redis = await this.getRedis();
    await redis.hset(REPEAT_KEY_HASH, gameId, repeatKey);
    const written = await redis.hset(REPEAT_KEY_HASH, gameId, repeatKey);
    this.log.warn(`[poller] persisted repeatKey to redis game=${gameId} wrote=${written}`);
  }

  private async loadPersistedRepeatKey(gameId: string): Promise<string | null> {
    const cached = this.repeatKeyByGameId.get(gameId);
    if (cached != null && cached !== '') return cached;

    const redis = await this.getRedis();
    const v = await redis.hget(REPEAT_KEY_HASH, gameId);
    if (v != null && v !== '') {
      this.repeatKeyByGameId.set(gameId, v);
      return v;
    }
    return null;
  }

  private async clearPersistedRepeatKey(gameId: string): Promise<void> {
    this.repeatKeyByGameId.delete(gameId);
    const redis = await this.getRedis();
    await redis.hdel(REPEAT_KEY_HASH, gameId);
  }

  private makeRepeatJobId(gameId: string): string {
    // Deterministic, safe
    return `poll_${String(gameId).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }

  private cadenceToEveryMs(cadence: Cadence): number {
    const intervals: Record<Cadence, number> = {
      live: 3_000,
      warm: 10_000,
      cold: 60_000,
    };
    return intervals[cadence];
  }

  private isEnabled(gameId: string): boolean {
    return this.enabledGameIds.has(gameId);
  }

  private matchesRepeatableForGame(r: RepeatableJob, repeatJobId: string): boolean {
    return r.name === 'poll' && r.id === repeatJobId;
  }

  private async removeRepeatablesForGame(gameId: string): Promise<number> {
    const repeatJobId = this.makeRepeatJobId(gameId);
    const items: RepeatableJob[] = await this.queue.getRepeatableJobs();

    this.log.warn(
      `[poller] attempting removal for game=${gameId}, repeatJobId=${repeatJobId}, found=${items.length}`,
    );
    for (const r of items) {
      this.log.warn(`[poller] repeatable name=${r.name} id=${r.id} key=${r.key}`);
    }

    const matches = items.filter((r) => this.matchesRepeatableForGame(r, repeatJobId));

    for (const r of matches) {
      try {
        await this.queue.removeRepeatableByKey(r.key);
      } catch (e) {
        const msg: string = e instanceof Error ? e.message : String(e);
        this.log.warn(`[poller] failed removeRepeatableByKey key=${r.key}: ${msg}`);
      }
    }

    return matches.length;
  }

  /** Create or replace a repeatable polling job */
  public async upsertGamePoll(
    gameId: string,
    cadence: Cadence = 'warm',
  ): Promise<{ ok: true; gameId: string; cadence: Cadence; everyMs: number; removed: number } | { ok: false; gameId: string; reason: 'disabled' }> {
    if (!this.isEnabled(gameId)) {
      return { ok: false, gameId, reason: 'disabled' };
    }

    const everyMs = this.cadenceToEveryMs(cadence);
    const repeatJobId = this.makeRepeatJobId(gameId);

    // Critical: remove existing repeatable(s) for THIS game (match by key)
    const removed = await this.removeRepeatablesForGame(gameId);

    const job = await this.queue.add(
      'poll',
      { gameId },
      {
        jobId: repeatJobId,                 // ✅ top-level job id
        repeat: { every: everyMs, jobId: repeatJobId }, // drop jobId; it’s not working anyway here
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );

    // BullMQ returns repeatJobKey on the created job for repeatables
    const repeatKey: string | undefined = (job as any).repeatJobKey;
    if (typeof repeatKey === 'string' && repeatKey !== '') {
      await this.persistRepeatKey(gameId, repeatKey);
      this.log.log(`[poller] stored repeatKey for game=${gameId}: ${repeatKey}`);
    } else {
      this.log.warn(`[poller] repeatJobKey missing for game=${gameId}`);
    }
    this.log.log(
      `Scheduled ${repeatJobId} (${cadence}) every ${everyMs}ms (removed=${removed})`,
    );

    return { ok: true, gameId, cadence, everyMs, removed };
  }

  /** Stop polling for one game */
  public async removeGamePoll(
    gameId: string,
  ): Promise<{ ok: true; gameId: string; removed: number }> {
    const key: string | null = await this.loadPersistedRepeatKey(gameId);

    if (key != null) {
      try {
        await this.queue.removeRepeatableByKey(key);
        await this.clearPersistedRepeatKey(gameId);
        this.log.log(`[poller] Removed repeatable by key for ${gameId}: key=${key}`);
        return { ok: true, gameId, removed: 1 };
      } catch (e: unknown) {
        const msg: string = e instanceof Error ? e.message : String(e);
        this.log.warn(`[poller] failed removeRepeatableByKey game=${gameId} key=${key}: ${msg}`);
        // fall through to fallback
      }
    }

    // fallback: if we lost the key (restart before persistence existed, or mismatch), remove all poll repeatables
    const removed = await this.removeAllPollRepeatablesFallback();
    return { ok: true, gameId, removed };
  }

  /** Fire a one-off poll immediately (debug) */
  public async kickOnce(
    gameId: string,
  ): Promise<{ ok: true; gameId: string } | { ok: false; gameId: string; reason: 'disabled' }> {
    if (!this.isEnabled(gameId)) return { ok: false, gameId, reason: 'disabled' };

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

  private async removeAllPollRepeatablesFallback(): Promise<number> {
    const items = await this.queue.getRepeatableJobs();
    const matches = items.filter((r) => r.name === 'poll');

    for (const r of matches) {
      await this.queue.removeRepeatableByKey(r.key);
    }

    this.log.warn(`[poller] fallback removed ${matches.length} repeatables (name=poll)`);
    return matches.length;
  }
}
