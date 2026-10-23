import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

type Cadence = 'live' | 'warm' | 'cold';
type DailyCadence = 'live' | 'cold';

// Viewer polls carry a readable repeat key — `game:<id>:<everyMs>` /
// `daily:<date>:<everyMs>` — so every poll for one game or date can be found
// and removed. BullMQ 5 lists repeatables with no job id, so the old lookup
// by id matched nothing: a cadence change left the previous poll running and
// leaving viewers removed only the last one. By Oct 20, 2026 four orphaned 3s
// date polls were calling MLB ~120K times a day.
const GAME_KEY = 'game:';
const DAILY_KEY = 'daily:';

export type PollJobData =
  | { kind: 'game'; gameId: string }
  | { kind: 'daily'; dateKey: string };

@Injectable()
export class PollerProducer {
  private readonly log: Logger = new Logger(PollerProducer.name);

  private readonly enabledGameIds: Set<string> = new Set<string>();
  private readonly enabledDateKeys: Set<string> = new Set<string>();

  public constructor(
    @InjectQueue('game-poller') private readonly queue: Queue,
    @InjectQueue('daily-poller') private readonly dailyQueue: Queue,
  ) {}

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
      live: 3_000,
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

  private gameKeyPrefix(gameId: string): string {
    return `${GAME_KEY}${gameId}:`;
  }

  private dailyKeyPrefix(dateKey: string): string {
    return `${DAILY_KEY}${dateKey}:`;
  }

  /** Remove every repeatable on `queue` whose key starts with `prefix`. */
  private async removeRepeatablesByPrefix(
    queue: Queue,
    prefix: string,
  ): Promise<number> {
    let removed = 0;
    for (const r of await queue.getRepeatableJobs()) {
      if (!r.key.startsWith(prefix)) continue;
      try {
        await queue.removeRepeatableByKey(r.key);
        removed += 1;
      } catch (e: unknown) {
        const msg: string = e instanceof Error ? e.message : String(e);
        this.log.warn(
          `[poller] failed removeRepeatableByKey key=${r.key}: ${msg}`,
        );
      }
    }
    return removed;
  }

  // -----------------------
  // Public API: Game
  // -----------------------

  /** Create or replace a repeatable polling job for a game */
  public async upsertGamePoll(
    gameId: string,
    cadence: Cadence = 'warm',
  ): Promise<
    | {
        ok: true;
        gameId: string;
        cadence: Cadence;
        everyMs: number;
        removed: number;
      }
    | { ok: false; gameId: string; reason: 'disabled' }
  > {
    if (!this.isGameEnabled(gameId)) {
      return { ok: false, gameId, reason: 'disabled' };
    }

    const everyMs: number = this.cadenceToEveryMs(cadence);
    const repeatJobId: string = this.makeRepeatJobIdForGame(gameId);

    // Any poll for THIS game, whatever its cadence, is replaced.
    const removed: number = await this.removeRepeatablesByPrefix(
      this.queue,
      this.gameKeyPrefix(gameId),
    );

    await this.queue.add(
      'poll',
      { kind: 'game', gameId } satisfies PollJobData,
      {
        jobId: repeatJobId,
        repeat: {
          every: everyMs,
          key: `${this.gameKeyPrefix(gameId)}${everyMs}`,
        },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );

    this.log.log(
      `Scheduled ${repeatJobId} (${cadence}) every ${everyMs}ms (removed=${removed})`,
    );
    return { ok: true, gameId, cadence, everyMs, removed };
  }

  /** Stop polling for one game */
  public async removeGamePoll(
    gameId: string,
  ): Promise<{ ok: true; gameId: string; removed: number }> {
    const removed: number = await this.removeRepeatablesByPrefix(
      this.queue,
      this.gameKeyPrefix(gameId),
    );
    this.log.log(`[poller] removed ${removed} poll(s) for game=${gameId}`);
    return { ok: true, gameId, removed };
  }

  /** Fire a one-off poll immediately (debug) */
  public async kickOnce(
    gameId: string,
  ): Promise<
    | { ok: true; gameId: string }
    | { ok: false; gameId: string; reason: 'disabled' }
  > {
    if (!this.isGameEnabled(gameId))
      return { ok: false, gameId, reason: 'disabled' };

    await this.queue.add(
      'poll',
      { kind: 'game', gameId } satisfies PollJobData,
      {
        removeOnComplete: true,
      },
    );

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
    | {
        ok: true;
        dateKey: string;
        cadence: DailyCadence;
        everyMs: number;
        removed: number;
      }
    | { ok: false; dateKey: string; reason: 'disabled' }
  > {
    if (!this.isDailyEnabled(dateKey)) {
      return { ok: false, dateKey, reason: 'disabled' };
    }

    const everyMs: number = this.dailyCadenceToEveryMs(cadence);
    const repeatJobId: string = this.makeRepeatJobIdForDate(dateKey);

    // Any poll for THIS date, whatever its cadence, is replaced.
    const removed: number = await this.removeRepeatablesByPrefix(
      this.dailyQueue,
      this.dailyKeyPrefix(dateKey),
    );

    await this.dailyQueue.add(
      'poll',
      { kind: 'daily', dateKey } satisfies PollJobData,
      {
        jobId: repeatJobId,
        repeat: {
          every: everyMs,
          key: `${this.dailyKeyPrefix(dateKey)}${everyMs}`,
        },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );

    this.log.log(
      `Scheduled ${repeatJobId} (${cadence}) every ${everyMs}ms (removed=${removed})`,
    );
    return { ok: true, dateKey, cadence, everyMs, removed };
  }

  public async removeDailyPoll(
    dateKey: string,
  ): Promise<{ ok: true; dateKey: string; removed: number }> {
    const removed: number = await this.removeRepeatablesByPrefix(
      this.dailyQueue,
      this.dailyKeyPrefix(dateKey),
    );
    this.log.log(`[poller] removed ${removed} poll(s) for date=${dateKey}`);
    return { ok: true, dateKey, removed };
  }

  /** Fire a one-off daily poll immediately so the first subscriber gets a snapshot without waiting for the next repeat tick */
  public async kickOnceDaily(
    dateKey: string,
  ): Promise<{ ok: true; dateKey: string }> {
    await this.dailyQueue.add(
      'poll',
      { kind: 'daily', dateKey } satisfies PollJobData,
      { removeOnComplete: true },
    );
    this.log.log(`Kicked one-off daily poll for ${dateKey}`);
    return { ok: true, dateKey };
  }

  public enableDaily(dateKey: string): void {
    this.enabledDateKeys.add(dateKey);
  }

  public disableDaily(dateKey: string): void {
    this.enabledDateKeys.delete(dateKey);
  }

  // -----------------------
  // Safety net
  // -----------------------

  /**
   * Remove viewer polls nobody is watching: a game or date with no browser
   * subscribed, or a poll not in the readable-key form at all. Run by the
   * bootstrap reconcile so a missed removal can't poll MLB for days.
   * Seeded game polls ('poll-game', seed: keys) are the bootstrap's own.
   */
  public async pruneUnwatchedPolls(): Promise<{
    games: number;
    dates: number;
  }> {
    let games = 0;
    for (const r of await this.queue.getRepeatableJobs()) {
      if (r.name !== 'poll') continue;
      const gameId = r.key.startsWith(GAME_KEY)
        ? r.key.slice(GAME_KEY.length).split(':')[0]
        : null;
      if (gameId != null && this.isGameEnabled(gameId)) continue;
      await this.queue.removeRepeatableByKey(r.key);
      games += 1;
    }
    let dates = 0;
    for (const r of await this.dailyQueue.getRepeatableJobs()) {
      const dateKey = r.key.startsWith(DAILY_KEY)
        ? r.key.slice(DAILY_KEY.length).split(':')[0]
        : null;
      if (dateKey != null && this.isDailyEnabled(dateKey)) continue;
      await this.dailyQueue.removeRepeatableByKey(r.key);
      dates += 1;
    }
    return { games, dates };
  }
}
