import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { MlbApiService } from '../providers/mlb/mlb.service';
import type { MlbLiveFeed } from '../providers/mlb/mlb.types';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { GameDto } from '../games/dtos/game.dto';

type DailyPhase =
  | 'SCHEDULED'
  | 'LIVE'
  | 'FINAL'
  | 'DELAYED'
  | 'POSTPONED'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'WARMUP'
  | 'UNKNOWN';

type LiveEnrichment = {
  balls: number | null;
  strikes: number | null;
  on1: boolean;
  on2: boolean;
  on3: boolean;
  runner1: string | null;
  runner2: string | null;
  runner3: string | null;
  pitcherName: string | null;
  pitcherEra: string | null;
  pitchCount: number | null;
  batterName: string | null;
  batterAvg: string | null;
  batterHits: number | null;
  batterAtBats: number | null;
  awayHits: number | null;
  awayErrors: number | null;
  homeHits: number | null;
  homeErrors: number | null;
  elapsedMinutes: number | null;
};

type DailyGameStatusWire = {
  gameId: string;
  gameDate: string;
  startTimeUtc: string | null;
  homeAbbr: string;
  awayAbbr: string;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  phase: DailyPhase;
  inning: number | null;
  half: 'top' | 'bottom' | null;
  outs: number | null;
  statusText: string;
  detailedState: string | null;
  venue?: string | null;
  city?: string | null;
  state?: string | null;
  // Live enrichment (LIVE games only; null for others)
  balls: number | null;
  strikes: number | null;
  on1: boolean;
  on2: boolean;
  on3: boolean;
  pitcherName: string | null;
  pitcherEra: string | null;
  pitchCount: number | null;
  batterName: string | null;
  batterAvg: string | null;
  batterHits: number | null;
  batterAtBats: number | null;
  awayHits: number | null;
  awayErrors: number | null;
  homeHits: number | null;
  homeErrors: number | null;
  elapsedMinutes: number | null;
  runner1: string | null;
  runner2: string | null;
  runner3: string | null;
};

type DailySnapshotWire = {
  dateKey: string;
  ts: string;
  games: readonly DailyGameStatusWire[];
};

type DailyJobData = { kind: 'daily'; dateKey: string };

@Processor('daily-poller', { concurrency: 2 })
@Injectable()
export class DailyPollerProcessor extends WorkerHost {
  private readonly logger: Logger = new Logger(DailyPollerProcessor.name);

  public constructor(
    private readonly realtime: RealtimeGateway,
    private readonly mlb: MlbApiService,
  ) {
    super();
  }

  public async process(job: Job<DailyJobData>): Promise<void> {
    const dateKey: string | null =
      typeof job.data?.dateKey === 'string' && job.data.dateKey.trim() !== ''
        ? job.data.dateKey.trim()
        : null;

    if (dateKey == null) {
      this.logger.warn(
        `[DailyPollerProcessor] job missing dateKey name=${job.name} id=${job.id}`,
      );
      return;
    }

    this.logger.debug(
      `[DailyPollerProcessor] START job name=${job.name} id=${job.id} dateKey=${dateKey}`,
    );

    try {
      const schedule: readonly GameDto[] = (await this.mlb.getScheduleByDate(dateKey)) ?? [];
      const ts: string = new Date().toISOString();

      const games: DailyGameStatusWire[] = schedule.map((g: GameDto) =>
        this.mapGameDtoToDailyWire(dateKey, g),
      );

      // Fetch live state for LIVE games in parallel; failures are silently swallowed
      const liveGames = games.filter((g) => g.phase === 'LIVE');
      if (liveGames.length > 0) {
        const results = await Promise.allSettled(
          liveGames.map(async (g) => {
            const feed = await this.mlb.getLiveFeed(g.gameId);
            return { gameId: g.gameId, enrichment: this.extractLiveState(feed) };
          }),
        );
        const enrichmentMap = new Map<string, LiveEnrichment>();
        for (const result of results) {
          if (result.status === 'fulfilled') {
            enrichmentMap.set(result.value.gameId, result.value.enrichment);
          }
        }
        for (const game of games) {
          const enrichment = enrichmentMap.get(game.gameId);
          if (enrichment != null) Object.assign(game, enrichment);
        }
      }

      const snapshot: DailySnapshotWire = { dateKey, ts, games };

      this.realtime.publishDailySnapshot(dateKey, snapshot as unknown as Record<string, unknown>);
      await job.updateProgress(100);
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[DailyPollerProcessor] daily poll failed for ${dateKey}: ${msg}`);
    }
  }

  private mapGameDtoToDailyWire(dateKey: string, g: GameDto): DailyGameStatusWire {
    const gameId: string = String(g.providerGameId ?? '').trim();

    const detailedState: string | null =
      typeof g.detailedState === 'string' && g.detailedState.trim() !== ''
        ? g.detailedState
        : null;

    const phase: DailyPhase = this.mapDailyPhase(g.status, detailedState);

    const inning: number | null =
      phase === 'LIVE' ? (typeof g.inning === 'number' ? g.inning : null) : null;

    const half: 'top' | 'bottom' | null =
      phase === 'LIVE'
        ? g.half === 'top'
          ? 'top'
          : g.half === 'bottom'
            ? 'bottom'
            : null
        : null;

    const outs: number | null =
      phase === 'LIVE' ? (typeof g.outs === 'number' ? g.outs : null) : null;

    const statusText: string = this.makeStatusText(phase, inning, half, outs, detailedState);

    const homeScore: number | null =
      phase === 'LIVE' || phase === 'FINAL' ? (g.homeScore ?? null) : null;
    const awayScore: number | null =
      phase === 'LIVE' || phase === 'FINAL' ? (g.awayScore ?? null) : null;

    const startTimeUtc: string | null = this.normalizeStartTimeUtc(g.startTimeUtc);

    const snapshot = (g as any).snapshot ?? null;

    return {
      gameId: gameId !== '' ? gameId : 'UNKNOWN',
      gameDate: typeof g.gameDate === 'string' && g.gameDate !== '' ? g.gameDate : dateKey,
      startTimeUtc,
      homeAbbr: g.homeAbbr,
      awayAbbr: g.awayAbbr,
      homeName: g.homeName,
      awayName: g.awayName,
      homeScore,
      awayScore,
      phase,
      inning,
      half,
      outs,
      statusText,
      detailedState,
      venue: typeof snapshot?.venue === 'string' ? snapshot.venue : null,
      city: typeof snapshot?.city === 'string' ? snapshot.city : null,
      state: typeof snapshot?.state === 'string' ? snapshot.state : null,
      // Live enrichment — overwritten for LIVE games by extractLiveState()
      balls: null,
      strikes: null,
      on1: false,
      on2: false,
      on3: false,
      pitcherName: null,
      pitcherEra: null,
      pitchCount: null,
      batterName: null,
      batterAvg: null,
      batterHits: null,
      batterAtBats: null,
      awayHits: null,
      awayErrors: null,
      homeHits: null,
      homeErrors: null,
      elapsedMinutes: null,
      runner1: null,
      runner2: null,
      runner3: null,
    };
  }

  private mapDailyPhase(status: GameDto['status'], detailedState: string | null): DailyPhase {
    const ds: string = (detailedState ?? '').toLowerCase();
    if (ds.includes('postpon')) return 'POSTPONED';
    if (ds.includes('delay')) return 'DELAYED';
    if (ds.includes('suspend')) return 'SUSPENDED';
    if (ds.includes('cancel')) return 'CANCELLED';
    if (ds.includes('warmup') || ds.includes('warm-up')) return 'WARMUP';
    if (status === 'final') return 'FINAL';
    if (status === 'live') return 'LIVE';
    if (status === 'scheduled') return 'SCHEDULED';
    return 'UNKNOWN';
  }

  private makeStatusText(
    phase: DailyPhase,
    inning: number | null,
    half: 'top' | 'bottom' | null,
    outs: number | null,
    detailedState: string | null,
  ): string {
    if (phase === 'FINAL') return 'Final';

    if (phase === 'LIVE') {
      const caret: string = half === 'top' ? '▲' : half === 'bottom' ? '▼' : '';
      const inn: string = inning != null ? String(inning) : '?';
      const o: string = outs != null ? String(outs) : '?';
      const outLabel: string = o === '1' ? 'out' : 'outs';
      return `${caret}${inn} ${o} ${outLabel}`.trim();
    }

    if (phase === 'POSTPONED') return 'PPD';
    if (phase === 'DELAYED') return 'Delay';
    if (phase === 'SUSPENDED') return 'Susp';
    if (phase === 'CANCELLED') return 'Cancelled';
    if (phase === 'WARMUP') return 'Warmup';
    if (phase === 'SCHEDULED') return '';

    if (detailedState != null && detailedState.trim() !== '') return detailedState;
    return 'Unknown';
  }

  private extractLiveState(feed: MlbLiveFeed): LiveEnrichment {
    const ld = feed.liveData;
    const linescore = ld?.linescore;
    const currentPlay = ld?.plays?.currentPlay;

    // Count: linescore is more current (updates between pitches); fall back to current play
    const balls: number | null = linescore?.balls ?? currentPlay?.count?.balls ?? null;
    const strikes: number | null = linescore?.strikes ?? currentPlay?.count?.strikes ?? null;

    // Bases: non-null value = occupied
    const offense = linescore?.offense;
    const on1 = offense?.first != null;
    const on2 = offense?.second != null;
    const on3 = offense?.third != null;

    // Names from current play matchup
    const matchup = currentPlay?.matchup ?? {};
    const batterName: string | null = matchup.batter?.fullName ?? null;
    const pitcherName: string | null = matchup.pitcher?.fullName ?? null;
    const batterId = matchup.batter?.id;
    const pitcherId = matchup.pitcher?.id;

    // Season stats + game pitch count from boxscore (not fully typed — use any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const boxTeams = ((feed as any).liveData?.boxscore?.teams) ?? {};
    const readPlayer = (side: string, id: number | undefined): Record<string, unknown> | null => {
      if (id == null) return null;
      return (boxTeams[side]?.players?.[`ID${id}`] as Record<string, unknown> | undefined) ?? null;
    };

    const batterPlayer = readPlayer('home', batterId) ?? readPlayer('away', batterId);
    const pitcherPlayer = readPlayer('home', pitcherId) ?? readPlayer('away', pitcherId);

    const batterAvgRaw = (batterPlayer as any)?.seasonStats?.batting?.avg
      ?? (batterPlayer as any)?.seasonStats?.batting?.average;
    const batterAvg: string | null =
      typeof batterAvgRaw === 'string' ? batterAvgRaw
      : typeof batterAvgRaw === 'number' ? String(batterAvgRaw)
      : null;

    const batterHitsRaw = (batterPlayer as any)?.stats?.batting?.hits;
    const batterHits: number | null = typeof batterHitsRaw === 'number' ? batterHitsRaw : null;

    const batterAtBatsRaw = (batterPlayer as any)?.stats?.batting?.atBats;
    const batterAtBats: number | null = typeof batterAtBatsRaw === 'number' ? batterAtBatsRaw : null;

    const pitcherEraRaw = (pitcherPlayer as any)?.seasonStats?.pitching?.era;
    const pitcherEra: string | null =
      typeof pitcherEraRaw === 'string' ? pitcherEraRaw
      : typeof pitcherEraRaw === 'number' ? String(pitcherEraRaw)
      : null;

    const pitchCountRaw = (pitcherPlayer as any)?.stats?.pitching?.numberOfPitches;
    const pitchCount: number | null = typeof pitchCountRaw === 'number' ? pitchCountRaw : null;

    // Runner labels per base: "#27 Jose Altuve"
    const formatRunner = (basePlayer: Record<string, unknown> | null | undefined): string | null => {
      if (basePlayer == null) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const id = (basePlayer as any).id;
      const name: string | null = (basePlayer as any).fullName ?? null;
      if (name == null) return null;
      const bp = readPlayer('home', id) ?? readPlayer('away', id);
      const jersey = (bp as any)?.jerseyNumber;
      const jerseyStr = typeof jersey === 'string' && jersey.trim() !== '' ? jersey
        : typeof jersey === 'number' ? String(jersey) : null;
      return jerseyStr != null ? `#${jerseyStr} ${name}` : name;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const offenseAny = offense as any;
    const runner1 = formatRunner(offenseAny?.first);
    const runner2 = formatRunner(offenseAny?.second);
    const runner3 = formatRunner(offenseAny?.third);

    // Team totals from linescore (hits, errors)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lsTeams = (linescore as any)?.teams ?? {};
    const awayHits: number | null = typeof lsTeams.away?.hits === 'number' ? lsTeams.away.hits : null;
    const awayErrors: number | null = typeof lsTeams.away?.errors === 'number' ? lsTeams.away.errors : null;
    const homeHits: number | null = typeof lsTeams.home?.hits === 'number' ? lsTeams.home.hits : null;
    const homeErrors: number | null = typeof lsTeams.home?.errors === 'number' ? lsTeams.home.errors : null;

    // Elapsed game time in minutes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elapsedRaw = (feed as any).gameData?.gameInfo?.gameDurationMinutes;
    const elapsedMinutes: number | null = typeof elapsedRaw === 'number' ? elapsedRaw : null;

    return {
      balls, strikes, on1, on2, on3, runner1, runner2, runner3,
      batterName, batterAvg, batterHits, batterAtBats,
      pitcherName, pitcherEra, pitchCount,
      awayHits, awayErrors, homeHits, homeErrors, elapsedMinutes,
    };
  }

  private normalizeStartTimeUtc(value: unknown): string | null {
    if (value == null) return null;
    if (typeof value === 'string') {
      const d: Date = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }
    return null;
  }
}
