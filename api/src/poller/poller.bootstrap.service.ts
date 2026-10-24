import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import { MlbApiService } from '../providers/mlb/mlb.service';
import { PollerProducer, removeRecurring } from './poller.producer';

// The background poll of tonight's games — what keeps Home's "What's hot",
// clip ingest, Baseball IQ insights and the games table current with no one
// watching. A viewer opening a game adds its own 3s poll (RealtimeGateway).
//
// Reconciled, not just seeded: every RECONCILE_MS the set of 15s 'poll-game'
// jobs is made to match the games that need one — live, about to start, or
// just finished — and every other one is removed. (It used to add a job per
// game at each startup and never remove any: 1,058 had piled up by Oct 10,
// 2026, polling long-finished games ~40 MLB requests a second.)
const SEED_JOB = 'poll-game';
// One BullMQ job scheduler per seeded game, id `seed_<gameId>`. (The old
// `seed:<gameId>` repeat key was refused by BullMQ — "Custom Id cannot
// contain :" — leaving an empty entry that never ran; startup clears those.)
const SEED_ID = 'seed_';
const LEGACY_SEED_KEY = 'seed:';
const SEED_EVERY_MS = 15_000;
const RECONCILE_MS = 5 * 60_000;
const START_LOOKAHEAD_MS = 30 * 60_000; // seed a game this long before first pitch
const FINAL_TAIL_MS = 30 * 60_000; // keep polling this long after it goes final

// MLB's "day" in America/New_York; late West Coast games end after midnight
// ET, so the previous ET date is checked too until 6am ET.
function etDate(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

@Injectable()
export class PollerBootstrapService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(PollerBootstrapService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  // Games this process has seen live, and when each then went final.
  private readonly seenLive = new Set<string>();
  private readonly finalSince = new Map<string, number>();

  public constructor(
    @InjectQueue('game-poller')
    private readonly pollerQueue: Queue<{ gameId: string }>,
    @InjectQueue('daily-poller')
    private readonly dailyQueue: Queue,
    private readonly mlbService: MlbApiService,
    private readonly producer: PollerProducer,
  ) {}

  public async onModuleInit(): Promise<void> {
    if (process.env.SPEC_GEN === '1' || process.env.NODE_ENV === 'test') return;
    await this.clearOrphans();
    await this.reconcile();
    this.timer = setInterval(() => void this.reconcile(), RECONCILE_MS);
  }

  public onModuleDestroy(): void {
    if (this.timer != null) clearInterval(this.timer);
  }

  // Viewer-driven polls ('poll' game jobs, daily-poller date jobs) are tracked
  // in memory by RealtimeGateway but persist in Redis, so a restart orphans
  // them. Browsers re-join their games and dates on reconnect, which adds
  // them back — so clear them all at startup.
  private async clearOrphans(): Promise<void> {
    let viewer = 0;
    for (const r of await this.pollerQueue.getRepeatableJobs()) {
      if (r.name === SEED_JOB && r.key.startsWith(SEED_ID)) continue;
      await removeRecurring(this.pollerQueue, r.key);
      viewer += 1;
    }
    let daily = 0;
    for (const r of await this.dailyQueue.getRepeatableJobs()) {
      await removeRecurring(this.dailyQueue, r.key);
      daily += 1;
    }
    this.log.log(
      `cleared ${viewer} orphaned viewer game polls, ${daily} daily polls`,
    );
  }

  public async reconcile(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      // Safety net for viewer polls: any game or date no browser is watching
      // goes, so a missed removal can't keep polling MLB for days.
      const pruned = await this.producer.pruneUnwatchedPolls();
      if (pruned.games > 0 || pruned.dates > 0) {
        this.log.log(
          `pruned unwatched polls: ${pruned.games} game · ${pruned.dates} date`,
        );
      }

      const now = Date.now();
      const dates = new Set([
        etDate(new Date(now)),
        etDate(new Date(now - 6 * 3600_000)),
      ]);
      const games = (
        await Promise.all(
          [...dates].map((d) => this.mlbService.getScheduleByDate(d)),
        )
      ).flat();

      const want = new Set<string>();
      for (const g of games) {
        const id = g.providerGameId;
        if (id == null) continue;
        if (g.status === 'live') {
          want.add(id);
        } else if (g.status === 'scheduled') {
          const start =
            g.startTimeUtc != null ? new Date(g.startTimeUtc).getTime() : NaN;
          if (Number.isFinite(start) && start - now <= START_LOOKAHEAD_MS)
            want.add(id);
        } else if (g.status === 'final') {
          // Only a game this process saw live gets the tail, timed from when
          // it went final; one that was already over at startup is left alone.
          if (!this.seenLive.has(id)) continue;
          const since = this.finalSince.get(id) ?? now;
          this.finalSince.set(id, since);
          if (now - since <= FINAL_TAIL_MS) want.add(id);
        }
      }
      for (const g of games) {
        if (g.status === 'live' && g.providerGameId != null) {
          this.seenLive.add(g.providerGameId);
          this.finalSince.delete(g.providerGameId);
        }
      }

      // Bring the seeded jobs in line: remove the rest, add what's missing.
      const have = new Map<string, string>(); // gameId → repeat key
      let removed = 0;
      for (const r of await this.pollerQueue.getRepeatableJobs()) {
        if (r.name !== SEED_JOB && !r.key.startsWith(LEGACY_SEED_KEY)) continue;
        const gameId = r.key.startsWith(SEED_ID)
          ? r.key.slice(SEED_ID.length)
          : null;
        if (gameId != null && want.has(gameId) && !have.has(gameId)) {
          have.set(gameId, r.key);
        } else {
          await removeRecurring(this.pollerQueue, r.key);
          removed += 1;
        }
      }
      let added = 0;
      for (const gameId of want) {
        if (have.has(gameId)) continue;
        await this.pollerQueue.upsertJobScheduler(
          `${SEED_ID}${gameId}`,
          { every: SEED_EVERY_MS },
          {
            name: SEED_JOB,
            data: { gameId },
            opts: { removeOnComplete: true, removeOnFail: true },
          },
        );
        added += 1;
      }
      if (added > 0 || removed > 0) {
        this.log.log(
          `seeded polls: ${want.size} wanted · added ${added} · removed ${removed}`,
        );
      }
    } catch (e: unknown) {
      this.log.warn(
        `seed reconcile failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      this.running = false;
    }
  }
}
