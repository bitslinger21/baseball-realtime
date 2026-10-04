import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { In, MoreThan, Repository } from 'typeorm';
import { Alert } from '../persistence/entities/alert.entity';
import { Clip } from '../persistence/entities/clip.entity';
import { MlbApiService } from '../providers/mlb/mlb.service';
import {
  careerCandidates,
  detect,
  type CareerBase,
  type Detection,
  type GameSnap,
  type LiveStory,
  type ProgWire,
  type RawFeed,
  type StoryEnd,
} from './alert-detect';

// The header bell's feed (PROMPT_alerts.md, F-009). League-wide: every live
// game on tonight's schedule is read every TICK_MS, independent of the game
// poller (which only covers games seeded at startup). Stories start, update
// in place under the same alert, and end with a second alert; one-off
// moments land as already over.
const TICK_MS = 30_000;
const FEED = 'feed' as const;

export interface AlertFeedItem {
  id: string;
  storyId: string;
  kind: string;
  big: boolean;
  live: boolean;
  at: string;
  playerId: number;
  playerShort: string;
  teamAbbr: string;
  title: string;
  sub: string;
  gamePk: string;
  away: string;
  home: string;
  score: [number, number];
  half: string;
  clipId: string | null;
  prog: ProgWire | null;
}

// What's kept per alert beyond the wire fields.
interface Stored extends AlertFeedItem {
  dayKey: string;
  clipAtBat: number | null;
  pastTitle: string | null;
  fallbackEnd: StoryEnd | null;
}

// Tonight = the ET calendar day, rolling over at 4am ET.
export function alertDayKey(now: Date): string {
  const shifted = new Date(now.getTime() - 4 * 3600_000);
  return shifted.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

@Injectable()
export class AlertFeedService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(AlertFeedService.name);
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;

  private dayKey: string | null = null;
  private readonly alerts = new Map<string, Stored>(); // by alert id
  private readonly liveByStory = new Map<string, string>(); // storyId → alert id
  private readonly seenStories = new Set<string>(); // never restart a story
  private readonly finalsDone = new Set<string>();
  private readonly careers = new Map<number, CareerBase>();
  private readonly careerMisses = new Set<number>();

  constructor(
    private readonly mlb: MlbApiService,
    @InjectRepository(Alert) private readonly alertsRepo: Repository<Alert>,
    @InjectRepository(Clip) private readonly clipsRepo: Repository<Clip>,
  ) {}

  onModuleInit(): void {
    if (process.env.SPEC_GEN === '1' || process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.timer != null) clearInterval(this.timer);
  }

  /** Tonight's alerts, newest first. */
  async list(): Promise<AlertFeedItem[]> {
    await this.ensureDay(alertDayKey(new Date()));
    return [...this.alerts.values()]
      .sort((a, b) => b.at.localeCompare(a.at))
      .map(toWire);
  }

  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const dayKey = alertDayKey(new Date());
      await this.ensureDay(dayKey);
      const schedule = await this.mlb.getScheduleByDate(dayKey);
      const pks = schedule
        .filter((g) => g.status === 'live' || g.status === 'final')
        .map((g) => g.providerGameId)
        .filter((pk): pk is string => pk != null && !this.finalsDone.has(pk));
      const changed = new Set<string>();
      for (const pk of pks) {
        try {
          const feed = (await this.mlb.getLiveFeedCached(pk)) as unknown as RawFeed;
          await this.loadCareers(careerCandidates(feed), dayKey.slice(0, 4));
          const det = detect(feed, this.careers);
          if (det == null) continue;
          this.reconcile(det, dayKey, changed);
          if (det.final) this.finalsDone.add(pk);
        } catch (e: unknown) {
          this.log.warn(`alert detection failed for ${pk}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      await this.resolveClips(changed);
      await this.persist(changed);
    } catch (e: unknown) {
      this.log.warn(`alert tick failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      this.ticking = false;
    }
  }

  // Applies one game's detection to the stored alerts. Exposed for tests.
  reconcile(det: Detection, dayKey: string, changed: Set<string>, now = new Date()): void {
    const { game } = det;
    const detected = new Map(det.stories.map((s) => [s.storyId, s]));

    // End live stories of this game that are no longer detected.
    for (const [storyId, alertId] of [...this.liveByStory]) {
      const a = this.alerts.get(alertId);
      if (a == null || a.gamePk !== game.gamePk || detected.has(storyId)) continue;
      const end = det.endings.get(storyId) ?? a.fallbackEnd;
      this.endStory(a, end, game, dayKey, changed, now);
    }

    // Start or update the live ones.
    for (const s of det.stories) {
      const alertId = this.liveByStory.get(s.storyId);
      const existing = alertId != null ? this.alerts.get(alertId) : undefined;
      if (existing != null) {
        const next: Stored = { ...existing, ...storyFields(s), ...gameFields(game) };
        if (JSON.stringify(next) !== JSON.stringify(existing)) {
          this.alerts.set(existing.id, next);
          changed.add(existing.id);
        }
        continue;
      }
      if (!s.canStart || this.seenStories.has(s.storyId)) continue;
      const a: Stored = {
        id: randomUUID(),
        storyId: s.storyId,
        at: now.toISOString(),
        live: true,
        clipId: null,
        clipAtBat: null,
        dayKey,
        ...storyFields(s),
        ...gameFields(game),
      };
      this.add(a, changed);
    }

    // One-off moments.
    for (const m of det.moments) {
      if (this.seenStories.has(m.id)) continue;
      this.add(
        {
          id: randomUUID(),
          storyId: m.id,
          kind: m.kind,
          big: false,
          live: false,
          at: m.at ?? now.toISOString(),
          playerId: m.playerId,
          playerShort: m.playerShort,
          teamAbbr: m.teamAbbr,
          title: m.title,
          sub: m.sub,
          prog: null,
          clipId: null,
          clipAtBat: m.atBatIndex,
          pastTitle: null,
          fallbackEnd: null,
          dayKey,
          ...gameFields(game),
        },
        changed,
      );
    }
  }

  private endStory(a: Stored, end: StoryEnd | null, game: GameSnap, dayKey: string, changed: Set<string>, now: Date): void {
    this.liveByStory.delete(a.storyId);
    const original: Stored = {
      ...a,
      live: false,
      big: false,
      title: a.pastTitle ?? a.title,
      sub: end?.pastSub ?? 'Ended',
      fallbackEnd: null,
      ...gameFields(game),
    };
    this.alerts.set(a.id, original);
    changed.add(a.id);
    if (end == null) return;
    const id = randomUUID();
    this.alerts.set(id, {
      id,
      storyId: a.storyId,
      kind: end.kind,
      big: false,
      live: false,
      at: end.at ?? now.toISOString(),
      playerId: end.playerId,
      playerShort: end.playerShort,
      teamAbbr: end.teamAbbr,
      title: end.title,
      sub: end.sub,
      prog: null,
      clipId: null,
      clipAtBat: end.atBatIndex,
      pastTitle: null,
      fallbackEnd: null,
      dayKey,
      ...gameFields(game),
    });
    changed.add(id);
  }

  private add(a: Stored, changed: Set<string>): void {
    this.alerts.set(a.id, a);
    this.seenStories.add(a.storyId);
    if (a.live) this.liveByStory.set(a.storyId, a.id);
    changed.add(a.id);
  }

  // Swap to a new night: drop memory and reload whatever was saved for it
  // (a restart mid-evening keeps the tray and the live stories).
  private async ensureDay(dayKey: string): Promise<void> {
    if (this.dayKey === dayKey) return;
    this.dayKey = dayKey;
    this.alerts.clear();
    this.liveByStory.clear();
    this.seenStories.clear();
    this.finalsDone.clear();
    this.careers.clear();
    this.careerMisses.clear();
    try {
      const rows = await this.alertsRepo.find({
        where: { type: FEED, createdAt: MoreThan(new Date(Date.now() - 36 * 3600_000)) },
      });
      for (const r of rows) {
        const a = r.payload as unknown as Stored;
        if (a?.dayKey !== dayKey) continue;
        this.alerts.set(a.id, a);
        this.seenStories.add(a.storyId);
        if (a.live) this.liveByStory.set(a.storyId, a.id);
      }
    } catch (e: unknown) {
      this.log.warn(`alert reload failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async loadCareers(ids: number[], season: string): Promise<void> {
    const missing = [...new Set(ids)].filter((id) => !this.careers.has(id) && !this.careerMisses.has(id));
    if (missing.length === 0) return;
    const got = await this.mlb.getCareerBases(missing, season);
    for (const id of missing) {
      const c = got.get(id);
      if (c != null) this.careers.set(id, c);
      else this.careerMisses.add(id);
    }
  }

  // An over moment with a play gets that play's clip once the clip ingest
  // has it — the first-published clip of the at-bat (the main highlight).
  private async resolveClips(changed: Set<string>): Promise<void> {
    const pending = [...this.alerts.values()].filter((a) => !a.live && a.clipId == null && a.clipAtBat != null);
    if (pending.length === 0) return;
    const clips = await this.clipsRepo.find({
      where: { gameId: In([...new Set(pending.map((a) => a.gamePk))]) },
      select: { id: true, gameId: true, atBatIndex: true, publishedAt: true },
      order: { publishedAt: 'ASC' },
    });
    for (const a of pending) {
      const c = clips.find((x) => x.gameId === a.gamePk && x.atBatIndex === a.clipAtBat);
      if (c == null) continue;
      a.clipId = c.id;
      changed.add(a.id);
    }
  }

  private async persist(changed: Set<string>): Promise<void> {
    const rows = [...changed]
      .map((id) => this.alerts.get(id))
      .filter((a): a is Stored => a != null)
      .map((a) => ({ id: a.id, gameId: a.gamePk, type: FEED, payload: a as unknown as Record<string, unknown> }));
    if (rows.length > 0) await this.alertsRepo.save(rows);
  }
}

function storyFields(s: LiveStory): Pick<Stored, 'kind' | 'big' | 'playerId' | 'playerShort' | 'teamAbbr' | 'title' | 'sub' | 'prog' | 'pastTitle' | 'fallbackEnd'> {
  return {
    kind: s.kind,
    big: s.big,
    playerId: s.playerId,
    playerShort: s.playerShort,
    teamAbbr: s.teamAbbr,
    title: s.title,
    sub: s.sub,
    prog: s.prog ?? null,
    pastTitle: s.pastTitle,
    fallbackEnd: s.fallbackEnd,
  };
}

function gameFields(g: GameSnap): Pick<Stored, 'gamePk' | 'away' | 'home' | 'score' | 'half'> {
  return { gamePk: g.gamePk, away: g.away, home: g.home, score: g.score, half: g.half };
}

function toWire(a: Stored): AlertFeedItem {
  return {
    id: a.id,
    storyId: a.storyId,
    kind: a.kind,
    big: a.big,
    live: a.live,
    at: a.at,
    playerId: a.playerId,
    playerShort: a.playerShort,
    teamAbbr: a.teamAbbr,
    title: a.title,
    sub: a.sub,
    gamePk: a.gamePk,
    away: a.away,
    home: a.home,
    score: a.score,
    half: a.half,
    clipId: a.clipId,
    prog: a.prog,
  };
}
