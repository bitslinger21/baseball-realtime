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

type PitchMixEntry = {
  code: string;
  name: string;
  color: string;
  percent: number;
};

type PitchMixData = {
  entries: PitchMixEntry[];
  seenCount: number;
  avgVelocity: string | null;
};

type WinProbDataPoint = {
  inning: number;
  prob: number;
};

type WinProbData = {
  homeTeamWinProb: number;
  dataPoints: WinProbDataPoint[];
};

type FieldData = {
  altitude: number | null;
  seasonHR: number | null;
  distLF: number | null;
  distCF: number | null;
  distRF: number | null;
};

type WeatherData = {
  temp: number | null;
  condition: string | null;
  windSpeed: number | null;
  windDirection: string | null; // cardinal: "SW", "NE", etc.
  windLabel: string | null;     // raw MLB string for display
  windRotation: number | null;  // CSS rotation (deg) for field-image overlay; 0=toward HP, 180=toward CF
  humidity: number | null;
  pressure: number | null;
};

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
  pitchMix: PitchMixData | null;
  winProb: WinProbData | null;
  fieldCard: FieldData | null;
  weather: WeatherData | null;
  venue: string | null;
  city: string | null;
  state: string | null;
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
  pitchMix?: PitchMixData | null;
  winProb?: WinProbData | null;
  fieldCard?: FieldData | null;
  weather?: WeatherData | null;
};

type DailySnapshotWire = {
  dateKey: string;
  ts: string;
  games: readonly DailyGameStatusWire[];
};

type DailyJobData = { kind: 'daily'; dateKey: string };

const CARDINAL_BEARING: Record<string, number> = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5,
  SE: 135, SSE: 157.5, S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
  W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

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

    // Pitch mix: aggregate all pitches thrown by the current pitcher this game
    const PITCH_NAME: Record<string, string> = {
      FF: 'Four-seam', FA: 'Four-seam',
      SI: 'Sinker',    FT: 'Sinker',
      SL: 'Slider',
      CU: 'Curveball', KC: 'Curveball', CS: 'Curveball',
      CH: 'Change-up',
      FC: 'Cutter',
      SW: 'Sweeper',   ST: 'Sweeper',
      FS: 'Splitter',
      KN: 'Knuckleball',
    };
    const PITCH_COLOR: Record<string, string> = {
      FF: '#dc2626', FA: '#dc2626',
      SI: '#ea580c', FT: '#ea580c',
      SL: '#0891b2',
      CU: '#3b82f6', KC: '#3b82f6', CS: '#3b82f6',
      CH: '#16a34a',
      FC: '#a3a3a3',
      SW: '#7c3aed', ST: '#7c3aed',
      FS: '#14b8a6',
      KN: '#f59e0b',
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allPlays: any[] = (feed as any).liveData?.plays?.allPlays ?? [];
    type PitchAgg = { count: number; speedSum: number; speedCount: number };
    const agg = new Map<string, PitchAgg>();
    let totalPitches = 0;
    let globalSpeedSum = 0;
    let globalSpeedCount = 0;
    for (const play of allPlays) {
      if (pitcherId == null || play.matchup?.pitcher?.id !== pitcherId) continue;
      const events: any[] = Array.isArray(play.playEvents) ? play.playEvents : [];
      for (const ev of events) {
        if (!ev.isPitch) continue;
        const code: string = ev.details?.type?.code ?? 'XX';
        const speed: number | null = typeof ev.pitchData?.startSpeed === 'number' ? ev.pitchData.startSpeed : null;
        const entry = agg.get(code) ?? { count: 0, speedSum: 0, speedCount: 0 };
        entry.count++;
        if (speed != null) { entry.speedSum += speed; entry.speedCount++; globalSpeedSum += speed; globalSpeedCount++; }
        agg.set(code, entry);
        totalPitches++;
      }
    }
    let pitchMix: PitchMixData | null = null;
    if (totalPitches > 0) {
      const sorted = [...agg.entries()].sort((a, b) => b[1].count - a[1].count);
      let entries: PitchMixEntry[];
      if (sorted.length <= 5) {
        entries = sorted.map(([code, e]) => ({
          code,
          name: PITCH_NAME[code] ?? code,
          color: PITCH_COLOR[code] ?? '#a3a3a3',
          percent: Math.round((e.count / totalPitches) * 100),
        }));
      } else {
        const otherCount = sorted.slice(5).reduce((s, [, e]) => s + e.count, 0);
        entries = [
          ...sorted.slice(0, 5).map(([code, e]) => ({
            code,
            name: PITCH_NAME[code] ?? code,
            color: PITCH_COLOR[code] ?? '#a3a3a3',
            percent: Math.round((e.count / totalPitches) * 100),
          })),
          { code: 'XX', name: 'Other', color: '#a3a3a3', percent: Math.round((otherCount / totalPitches) * 100) },
        ];
      }
      const avgVelocity = globalSpeedCount > 0
        ? `${(globalSpeedSum / globalSpeedCount).toFixed(1)} mph`
        : null;
      pitchMix = { entries, seenCount: totalPitches, avgVelocity };
    }

    // Win probability time series: accumulate per-play deltas grouped by half-inning
    const halfOrder: string[] = [];
    const halfDeltas = new Map<string, number>();
    for (const play of allPlays) {
      const inn = typeof play.about?.inning === 'number' ? play.about.inning : null;
      const isTop = typeof play.about?.isTopInning === 'boolean' ? play.about.isTopInning : null;
      const delta = typeof play.about?.homeTeamWinProbabilityAdded === 'number'
        ? play.about.homeTeamWinProbabilityAdded
        : null;
      if (inn == null || isTop == null || delta == null) continue;
      const key = `${inn}-${isTop ? 'T' : 'B'}`;
      if (!halfOrder.includes(key)) halfOrder.push(key);
      halfDeltas.set(key, (halfDeltas.get(key) ?? 0) + delta);
    }
    let cumWinPct = 50;
    const wpPoints: WinProbDataPoint[] = [{ inning: 0, prob: 0 }];
    for (const key of halfOrder) {
      const d = halfDeltas.get(key)!;
      cumWinPct = Math.max(0, Math.min(100, cumWinPct + d * 100));
      const [innStr, halfStr] = key.split('-');
      const inn = Number(innStr);
      const inningPos = halfStr === 'T' ? inn - 0.5 : inn;
      wpPoints.push({ inning: inningPos, prob: Math.round((cumWinPct - 50) * 2) });
    }
    const winProb: WinProbData | null = wpPoints.length > 1
      ? { homeTeamWinProb: Math.round(cumWinPct), dataPoints: wpPoints }
      : null;

    // Field card: venue data, altitude, distances, season HRs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const venueData = (feed as any).gameData?.venue;
    const venue: string | null = typeof venueData?.name === 'string' ? venueData.name : null;
    const city: string | null = typeof venueData?.location?.city === 'string' ? venueData.location.city : null;
    const state: string | null =
      typeof venueData?.location?.stateAbbrev === 'string' ? venueData.location.stateAbbrev
      : typeof venueData?.location?.state === 'string' ? venueData.location.state
      : null;

    const altitudeRaw = venueData?.location?.elevation;
    const altitude: number | null = typeof altitudeRaw === 'number' ? Math.round(altitudeRaw) : null;

    // Foul-line distances from venue.fieldInfo (present in the live feed)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fi = venueData?.fieldInfo as any;
    const distLF: number | null = typeof fi?.leftLine === 'number' ? fi.leftLine : null;
    const distCF: number | null = typeof fi?.center === 'number' ? fi.center : null;
    const distRF: number | null = typeof fi?.rightLine === 'number' ? fi.rightLine : null;

    // Season HRs: sum each home team player's season stat (already in boxscore — no extra call)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const homePlayers = Object.values((boxTeams.home?.players ?? {}) as Record<string, any>);
    const seasonHR: number | null = homePlayers.length > 0
      ? homePlayers.reduce((sum: number, p: any) => {
          const hr = p?.seasonStats?.batting?.homeRuns;
          return sum + (typeof hr === 'number' ? hr : 0);
        }, 0)
      : null;

    const fieldCard: FieldData = { altitude, seasonHR, distLF, distCF, distRF };

    // Weather card: MLB live feed provides gameData.weather (temp, condition, wind as strings)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wxData = (feed as any).gameData?.weather;
    let wxTemp: number | null = null;
    let wxCondition: string | null = null;
    let wxWindSpeed: number | null = null;
    let wxWindDirection: string | null = null;
    let wxWindLabel: string | null = null;
    let wxWindRotation: number | null = null;
    if (wxData) {
      const tempRaw = wxData.temp;
      if (typeof tempRaw === 'number') wxTemp = tempRaw;
      else if (typeof tempRaw === 'string') {
        const n = parseFloat(tempRaw);
        if (!isNaN(n)) wxTemp = Math.round(n);
      }
      wxCondition = typeof wxData.condition === 'string' ? wxData.condition : null;
      const windStr: string | null = typeof wxData.wind === 'string' ? wxData.wind : null;
      if (windStr) {
        wxWindLabel = windStr;
        const lower = windStr.toLowerCase();
        if (lower === 'calm' || lower.includes('0 mph') || lower.includes('no wind')) {
          wxWindSpeed = 0;
        } else {
          const speedMatch = windStr.match(/(\d+(?:\.\d+)?)\s*mph/i);
          if (speedMatch) wxWindSpeed = Math.round(parseFloat(speedMatch[1]));
        }
        const dirMatch = windStr.match(
          /\b(N|NNE|NE|ENE|E|ESE|SE|SSE|S|SSW|SW|WSW|W|WNW|NW|NNW)\b/,
        );
        if (dirMatch) wxWindDirection = dirMatch[1];

        // Field-relative rotation for wind-rose SVG overlay:
        // 0° = arrows toward HP (In from CF), 90° = Left→Right, 180° = toward CF (Out), etc.
        // MLB often provides field-relative strings; for cardinal dirs assume field faces north.
        if (lower.includes('left to right')) wxWindRotation = 90;
        else if (lower.includes('right to left')) wxWindRotation = 270;
        else if (lower.includes('out to rf') || lower.includes('out to right')) wxWindRotation = 135;
        else if (lower.includes('out to lf') || lower.includes('out to left')) wxWindRotation = 225;
        else if (lower.includes('out to cf') || lower.includes('out to center')) wxWindRotation = 180;
        else if (lower.includes('in from rf') || lower.includes('in from right')) wxWindRotation = 315;
        else if (lower.includes('in from lf') || lower.includes('in from left')) wxWindRotation = 45;
        else if (lower.includes('in from cf') || lower.includes('in from center')) wxWindRotation = 0;
        else if (/,\s*out\b/.test(lower)) wxWindRotation = 180;
        else if (/,\s*in\b/.test(lower)) wxWindRotation = 0;
        else if (wxWindDirection != null) {
          // Cardinal fallback: assume field faces north (fieldBearing=0)
          // θ = (360 - windFromBearing) % 360
          const bearing = CARDINAL_BEARING[wxWindDirection] ?? null;
          if (bearing != null) wxWindRotation = (360 - bearing) % 360;
        }
      }
    }
    const weather: WeatherData = {
      temp: wxTemp,
      condition: wxCondition,
      windSpeed: wxWindSpeed,
      windDirection: wxWindDirection,
      windLabel: wxWindLabel,
      windRotation: wxWindRotation,
      humidity: null,
      pressure: null,
    };

    return {
      balls, strikes, on1, on2, on3, runner1, runner2, runner3,
      batterName, batterAvg, batterHits, batterAtBats,
      pitcherName, pitcherEra, pitchCount,
      awayHits, awayErrors, homeHits, homeErrors, elapsedMinutes,
      pitchMix, winProb, fieldCard, weather,
      venue, city, state,
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
