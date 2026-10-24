import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

type Cadence = 'live' | 'warm' | 'cold';
type DailyCadence = 'live' | 'cold';

// Viewer polls are BullMQ job schedulers with readable ids — `game_<id>`,
// `daily_<date>` — one per game or date. Upserting the same id changes its
// cadence in place, so a cadence change can never leave a second poll behind.
//
// History: the old repeatable jobs were looked up by a job id BullMQ 5 no
// longer lists, so a cadence change orphaned the previous poll (four 3s date
// polls were calling MLB ~120K times a day by Oct 20, 2026). The Oct 23 fix
// gave them custom repeat keys instead — and a repeatable with a custom key
// runs once and never reschedules, which silenced live games' pitch feeds.
const GAME_ID = 'game_';
const DAILY_ID = 'daily_';

/**
 * Remove one recurring job, scheduler or legacy repeatable (a pre-scheduler
 * entry can still be in Redis from an older build).
 */
export async function removeRecurring(
  queue: Queue,
  key: string,
): Promise<void> {
  const still = async (): Promise<boolean> =>
    (await queue.getRepeatableJobs()).some((r) => r.key === key);
  await queue.removeJobScheduler(key).catch(() => false);
  if (await still()) await queue.removeRepeatableByKey(key);
}

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

  private gameSchedulerId(gameId: string): string {
    return `${GAME_ID}${this.sanitizeIdPart(gameId)}`;
  }

  private dailySchedulerId(dateKey: string): string {
    return `${DAILY_ID}${this.sanitizeIdPart(dateKey)}`;
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
    const id: string = this.gameSchedulerId(gameId);

    // Same id, so any earlier cadence for this game is replaced in place.
    await this.queue.upsertJobScheduler(
      id,
      { every: everyMs },
      {
        name: 'poll',
        data: { kind: 'game', gameId } satisfies PollJobData,
        opts: { removeOnComplete: true, removeOnFail: 100 },
      },
    );
    const removed = 0;

    this.log.log(`Scheduled ${id} (${cadence}) every ${everyMs}ms`);
    return { ok: true, gameId, cadence, everyMs, removed };
  }

  /** Stop polling for one game */
  public async removeGamePoll(
    gameId: string,
  ): Promise<{ ok: true; gameId: string; removed: number }> {
    const removed = (await this.queue.removeJobScheduler(
      this.gameSchedulerId(gameId),
    ))
      ? 1
      : 0;
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
    const id: string = this.dailySchedulerId(dateKey);

    // Same id, so any earlier cadence for this date is replaced in place.
    await this.dailyQueue.upsertJobScheduler(
      id,
      { every: everyMs },
      {
        name: 'poll',
        data: { kind: 'daily', dateKey } satisfies PollJobData,
        opts: { removeOnComplete: true, removeOnFail: 100 },
      },
    );
    const removed = 0;

    this.log.log(`Scheduled ${id} (${cadence}) every ${everyMs}ms`);
    return { ok: true, dateKey, cadence, everyMs, removed };
  }

  public async removeDailyPoll(
    dateKey: string,
  ): Promise<{ ok: true; dateKey: string; removed: number }> {
    const removed = (await this.dailyQueue.removeJobScheduler(
      this.dailySchedulerId(dateKey),
    ))
      ? 1
      : 0;
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
   * subscribed, or a recurring job not in the scheduler form at all (left by
   * an older build). Run by the bootstrap reconcile so a missed removal can't
   * poll MLB for days. Seeded game polls ('poll-game') are the bootstrap's own.
   */
  public async pruneUnwatchedPolls(): Promise<{
    games: number;
    dates: number;
  }> {
    let games = 0;
    for (const r of await this.queue.getRepeatableJobs()) {
      if (r.name !== 'poll') continue;
      const gameId = r.key.startsWith(GAME_ID)
        ? r.key.slice(GAME_ID.length)
        : null;
      if (gameId != null && this.isGameEnabled(gameId)) continue;
      await removeRecurring(this.queue, r.key);
      games += 1;
    }
    let dates = 0;
    for (const r of await this.dailyQueue.getRepeatableJobs()) {
      const dateKey = r.key.startsWith(DAILY_ID)
        ? r.key.slice(DAILY_ID.length)
        : null;
      if (dateKey != null && this.isDailyEnabled(dateKey)) continue;
      await removeRecurring(this.dailyQueue, r.key);
      dates += 1;
    }
    return { games, dates };
  }
}
