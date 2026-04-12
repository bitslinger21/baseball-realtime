import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue, RepeatableJob } from 'bullmq';

type Cadence = 'live' | 'warm' | 'cold';
type DailyCadence = 'live' | 'cold';

type RedisHashClient = {
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<number>;
  hdel(key: string, field: string): Promise<number>;
};

const GAME_REPEAT_KEY_HASH = 'baseball:game-poller:repeatKeyByGameId';
const DAILY_REPEAT_KEY_HASH = 'baseball:game-poller:repeatKeyByDateKey';

export type PollJobData =
  | { kind: 'game'; gameId: string }
  | { kind: 'daily'; dateKey: string };

@Injectable()
export class PollerProducer {
  private readonly log: Logger = new Logger(PollerProducer.name);

  private readonly enabledGameIds: Set<string> = new Set<string>();
  private readonly enabledDateKeys: Set<string> = new Set<string>();

  private readonly repeatKeyByGameId: Map<string, string> = new Map();
  private readonly repeatKeyByDateKey: Map<string, string> = new Map();

  public constructor(@InjectQueue('game-poller') private readonly queue: Queue) { }

  // -----------------------
  // Redis helpers
  // -----------------------

  private async getRedis(): Promise<RedisHashClient> {
    const client: unknown = await this.queue.client;
    return client as RedisHashClient;
  }

  private async persistRepeatKeyForGame(gameId: string, repeatKey: string): Promise<void> {
    this.repeatKeyByGameId.set(gameId, repeatKey);
    const redis: RedisHashClient = await this.getRedis();
    const written: number = await redis.hset(GAME_REPEAT_KEY_HASH, gameId, repeatKey);
    this.log.warn(`[poller] persisted repeatKey to redis game=${gameId} wrote=${written}`);
  }

  private async loadPersistedRepeatKeyForGame(gameId: string): Promise<string | null> {
    const cached: string | undefined = this.repeatKeyByGameId.get(gameId);
    if (cached != null && cached !== '') return cached;

    const redis: RedisHashClient = await this.getRedis();
    const v: string | null = await redis.hget(GAME_REPEAT_KEY_HASH, gameId);
    if (v != null && v !== '') {
      this.repeatKeyByGameId.set(gameId, v);
      return v;
    }
    return null;
  }

  private async clearPersistedRepeatKeyForGame(gameId: string): Promise<void> {
    this.repeatKeyByGameId.delete(gameId);
    const redis: RedisHashClient = await this.getRedis();
    await redis.hdel(GAME_REPEAT_KEY_HASH, gameId);
  }

  private async persistRepeatKeyForDate(dateKey: string, repeatKey: string): Promise<void> {
    this.repeatKeyByDateKey.set(dateKey, repeatKey);
    const redis: RedisHashClient = await this.getRedis();
    const written: number = await redis.hset(DAILY_REPEAT_KEY_HASH, dateKey, repeatKey);
    this.log.warn(`[poller] persisted daily repeatKey to redis date=${dateKey} wrote=${written}`);
  }

  private async loadPersistedRepeatKeyForDate(dateKey: string): Promise<string | null> {
    const cached: string | undefined = this.repeatKeyByDateKey.get(dateKey);
    if (cached != null && cached !== '') return cached;

    const redis: RedisHashClient = await this.getRedis();
    const v: string | null = await redis.hget(DAILY_REPEAT_KEY_HASH, dateKey);
    if (v != null && v !== '') {
      this.repeatKeyByDateKey.set(dateKey, v);
      return v;
    }
    return null;
  }

  private async clearPersistedRepeatKeyForDate(dateKey: string): Promise<void> {
    this.repeatKeyByDateKey.delete(dateKey);
    const redis: RedisHashClient = await this.getRedis();
    await redis.hdel(DAILY_REPEAT_KEY_HASH, dateKey);
  }

  // -----------------------
  // Repeatable IDs / cadence
  // -----------------------

  private sanitizeIdPart(v: string): string {
    return String(v).replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private makeRepeatJobIdForGame(gameId: string): string {
    return `poll_game_${this.sanitizeIdPart(gameId)}`;
  }

  private makeRepeatJobIdForDate(dateKey: string): string {
    return `poll_daily_${this.sanitizeIdPart(dateKey)}`;
  }

  private cadenceToEveryMs(cadence: Cadence): number {
    const intervals: Record<Cadence, number> = {
      live: 3_000,
      warm: 10_000,
      cold: 60_000,
    };
    return intervals[cadence];
  }

  private dailyCadenceToEveryMs(cadence: DailyCadence): number {
    const intervals: Record<DailyCadence, number> = {
      live: 5_000,
      cold: 60_000,
    };
    return intervals[cadence];
  }

  private isGameEnabled(gameId: string): boolean {
    return this.enabledGameIds.has(gameId);
  }

  private isDailyEnabled(dateKey: string): boolean {
    return this.enabledDateKeys.has(dateKey);
  }

  private matchesRepeatable(r: RepeatableJob, repeatJobId: string): boolean {
    return r.name === 'poll' && r.id === repeatJobId;
  }

  private async removeRepeatablesByRepeatJobId(repeatJobId: string): Promise<number> {
    const items: RepeatableJob[] = await this.queue.getRepeatableJobs();
    const matches: RepeatableJob[] = items.filter((r) => this.matchesRepeatable(r, repeatJobId));

    for (const r of matches) {
      try {
        await this.queue.removeRepeatableByKey(r.key);
      } catch (e: unknown) {
        const msg: string = e instanceof Error ? e.message : String(e);
        this.log.warn(`[poller] failed removeRepeatableByKey key=${r.key}: ${msg}`);
      }
    }

    return matches.length;
  }

  // -----------------------
  // Public API: Game
  // -----------------------

  /** Create or replace a repeatable polling job for a game */
  public async upsertGamePoll(
    gameId: string,
    cadence: Cadence = 'warm',
  ): Promise<
    | { ok: true; gameId: string; cadence: Cadence; everyMs: number; removed: number }
    | { ok: false; gameId: string; reason: 'disabled' }
  > {
    if (!this.isGameEnabled(gameId)) {
      return { ok: false, gameId, reason: 'disabled' };
    }

    const everyMs: number = this.cadenceToEveryMs(cadence);
    const repeatJobId: string = this.makeRepeatJobIdForGame(gameId);

    // Remove existing repeatable(s) for THIS game (match by repeat job id)
    const removed: number = await this.removeRepeatablesByRepeatJobId(repeatJobId);

    const job = await this.queue.add(
      'poll',
      { kind: 'game', gameId } satisfies PollJobData,
      {
        jobId: repeatJobId,
        repeat: { every: everyMs, jobId: repeatJobId },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );

    const repeatKey: string | null = this.extractRepeatJobKey(job);
    if (repeatKey != null) {
      await this.persistRepeatKeyForGame(gameId, repeatKey);
      this.log.log(`[poller] stored repeatKey for game=${gameId}: ${repeatKey}`);
    } else {
      this.log.warn(`[poller] repeatJobKey missing for game=${gameId}`);
    }

    this.log.log(`Scheduled ${repeatJobId} (${cadence}) every ${everyMs}ms (removed=${removed})`);
    return { ok: true, gameId, cadence, everyMs, removed };
  }

  /** Stop polling for one game */
  public async removeGamePoll(gameId: string): Promise<{ ok: true; gameId: string; removed: number }> {
    const key: string | null = await this.loadPersistedRepeatKeyForGame(gameId);

    if (key != null) {
      try {
        await this.queue.removeRepeatableByKey(key);
        await this.clearPersistedRepeatKeyForGame(gameId);
        this.log.log(`[poller] Removed repeatable by key for ${gameId}: key=${key}`);
        return { ok: true, gameId, removed: 1 };
      } catch (e: unknown) {
        const msg: string = e instanceof Error ? e.message : String(e);
        this.log.warn(`[poller] failed removeRepeatableByKey game=${gameId} key=${key}: ${msg}`);
        // fall through
      }
    }

    // fallback: remove by repeat job id (scoped to this game)
    const repeatJobId: string = this.makeRepeatJobIdForGame(gameId);
    const removed: number = await this.removeRepeatablesByRepeatJobId(repeatJobId);
    this.log.warn(`[poller] fallback removed ${removed} repeatables for game=${gameId}`);
    return { ok: true, gameId, removed };
  }

  /** Fire a one-off poll immediately (debug) */
  public async kickOnce(
    gameId: string,
  ): Promise<{ ok: true; gameId: string } | { ok: false; gameId: string; reason: 'disabled' }> {
    if (!this.isGameEnabled(gameId)) return { ok: false, gameId, reason: 'disabled' };

    await this.queue.add('poll', { kind: 'game', gameId } satisfies PollJobData, {
      removeOnComplete: true,
    });

    this.log.log(`Kicked one-off poll for ${gameId}`);
    return { ok: true, gameId };
  }

  public enableGame(gameId: string): void {
    this.enabledGameIds.add(gameId);
  }

  public disableGame(gameId: string): void {
    this.enabledGameIds.delete(gameId);
  }

  // -----------------------
  // Public API: Daily
  // -----------------------

  public async upsertDailyPoll(
    dateKey: string,
    cadence: DailyCadence = 'cold',
  ): Promise<
    | { ok: true; dateKey: string; cadence: DailyCadence; everyMs: number; removed: number }
    | { ok: false; dateKey: string; reason: 'disabled' }
  > {
    if (!this.isDailyEnabled(dateKey)) {
      return { ok: false, dateKey, reason: 'disabled' };
    }

    const everyMs: number = this.dailyCadenceToEveryMs(cadence);
    const repeatJobId: string = this.makeRepeatJobIdForDate(dateKey);

    const removed: number = await this.removeRepeatablesByRepeatJobId(repeatJobId);

    const job = await this.queue.add(
      'poll',
      { kind: 'daily', dateKey } satisfies PollJobData,
      {
        jobId: repeatJobId,
        repeat: { every: everyMs, jobId: repeatJobId },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );

    const repeatKey: string | null = this.extractRepeatJobKey(job);
    if (repeatKey != null) {
      await this.persistRepeatKeyForDate(dateKey, repeatKey);
      this.log.log(`[poller] stored daily repeatKey for date=${dateKey}: ${repeatKey}`);
    } else {
      this.log.warn(`[poller] daily repeatJobKey missing for date=${dateKey}`);
    }

    this.log.log(`Scheduled ${repeatJobId} (${cadence}) every ${everyMs}ms (removed=${removed})`);
    return { ok: true, dateKey, cadence, everyMs, removed };
  }

  public async removeDailyPoll(dateKey: string): Promise<{ ok: true; dateKey: string; removed: number }> {
    const key: string | null = await this.loadPersistedRepeatKeyForDate(dateKey);

    if (key != null) {
      try {
        await this.queue.removeRepeatableByKey(key);
        await this.clearPersistedRepeatKeyForDate(dateKey);
        this.log.log(`[poller] Removed daily repeatable by key for ${dateKey}: key=${key}`);
        return { ok: true, dateKey, removed: 1 };
      } catch (e: unknown) {
        const msg: string = e instanceof Error ? e.message : String(e);
        this.log.warn(`[poller] failed removeRepeatableByKey daily date=${dateKey} key=${key}: ${msg}`);
        // fall through
      }
    }

    const repeatJobId: string = this.makeRepeatJobIdForDate(dateKey);
    const removed: number = await this.removeRepeatablesByRepeatJobId(repeatJobId);
    this.log.warn(`[poller] fallback removed ${removed} repeatables for date=${dateKey}`);
    return { ok: true, dateKey, removed };
  }

  public enableDaily(dateKey: string): void {
    this.enabledDateKeys.add(dateKey);
  }

  public disableDaily(dateKey: string): void {
    this.enabledDateKeys.delete(dateKey);
  }

  // -----------------------
  // Internals
  // -----------------------

  private extractRepeatJobKey(job: unknown): string | null {
    // BullMQ returns repeatJobKey on the created Job for repeatables.
    // We avoid `any` by narrowing to a simple structural type.
    if (job == null || typeof job !== 'object') return null;

    const rec: Record<string, unknown> = job as Record<string, unknown>;
    const key: unknown = rec['repeatJobKey'];
    return typeof key === 'string' && key.trim() !== '' ? key : null;
  }
}
