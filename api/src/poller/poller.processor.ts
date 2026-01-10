// api/src/poller/poller.processor.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { Game } from '../persistence/entities/game.entity';
import { PollerService, type GameMeta, type LiveUpdate } from './poller.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AlertsService } from '../alerts/alerts.service';
import { StatsService } from '../stats/stats.service';
import { MlbApiService } from 'src/providers/mlb/mlb.service';
import { GameDto } from 'src/games/dtos/game.dto';

export type TeamRheWire = {
  runs: number;
  hits: number;
  errors: number;
};

export type LinescoreWire = {
  away: TeamRheWire;
  home: TeamRheWire;
};

export type PlayUpdateWire = {
  linescore?: LinescoreWire;
  providerGameId: string;
  inning: number;
  half: 'top' | 'bottom';
  outs: number;
  balls: number;
  strikes: number;
  bases: {
    on1: boolean;
    on2: boolean;
    on3: boolean;
  };
  homeScore: number;
  awayScore: number;
  description: string;
  batterName?: string;
  pitcherName?: string;
  batterAvg?: number;
  pitcherEra?: number;
  ts: string;
  pitchType?: string;
  pitchSpeedMph?: number;
};

type ScheduleMeta = {
  gameDate: string;
  homeAbbr: string;
  awayAbbr: string;
  status: Game['status'];
  startTimeUtc: string | null;
};

type PollJobData =
  | { kind: 'game'; gameId: string }
  | { kind: 'daily'; dateKey: string }
  // backward compat: existing repeatables may still send { gameId }
  | { gameId: string };

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

  // Column 4: for LIVE/FINAL/EDGE; for SCHEDULED the client formats startTimeUtc in local time
  statusText: string;

  // optional raw state for debugging/UI fallback
  detailedState: string | null;
};

type DailySnapshotWire = {
  dateKey: string;
  ts: string;
  games: readonly DailyGameStatusWire[];
};

@Processor('game-poller')
@Injectable()
export class PollerProcessor extends WorkerHost {
  private readonly logger: Logger = new Logger(PollerProcessor.name);
  private readonly lastPlayKeyByGame: Map<string, string> = new Map();

  public constructor(
    private readonly poller: PollerService,
    private readonly realtime: RealtimeGateway,
    private readonly alerts: AlertsService,
    @InjectRepository(Game) private readonly gamesRepo: Repository<Game>,
    private readonly stats: StatsService,
    private readonly mlb: MlbApiService,
  ) {
    super();
  }

  public async process(job: Job<PollJobData>): Promise<void> {
    const data: PollJobData = job.data;

    const kind: 'game' | 'daily' =
      'kind' in data && (data.kind === 'daily' || data.kind === 'game')
        ? data.kind
        : 'game';

    if (kind === 'daily') {
      const dateKey: string | null =
        'dateKey' in data && typeof data.dateKey === 'string' && data.dateKey.trim() !== ''
          ? data.dateKey.trim()
          : null;

      if (dateKey == null) {
        this.logger.warn(
          `[PollerProcessor] daily job missing dateKey name=${job.name} id=${job.id}`,
        );
        return;
      }

      await this.processDailyPoll(job, dateKey);
      return;
    }

    const gameId: string | null =
      'gameId' in data && typeof data.gameId === 'string' && data.gameId.trim() !== ''
        ? data.gameId.trim()
        : null;

    if (gameId == null) {
      this.logger.warn(
        `[PollerProcessor] game job missing gameId name=${job.name} id=${job.id}`,
      );
      return;
    }

    await this.processGamePoll(job as unknown as Job<{ gameId: string }>, gameId);
  }

  // -----------------------------
  // DAILY POLL
  // -----------------------------

  private async processDailyPoll(job: Job<PollJobData>, dateKey: string): Promise<void> {
    this.logger.log(
      `[PollerProcessor] START DAILY job name=${job.name} id=${job.id} dateKey=${dateKey}`,
    );

    try {
      const schedule: readonly GameDto[] = (await this.mlb.getScheduleByDate(dateKey)) ?? [];
      const ts: string = new Date().toISOString();

      const games: DailyGameStatusWire[] = schedule.map((g: GameDto) =>
        this.mapGameDtoToDailyWire(dateKey, g),
      );

      const snapshot: DailySnapshotWire = {
        dateKey,
        ts,
        games,
      };

      // room: daily:YYYY-MM-DD, event: 'daily'
      this.realtime.publishDailySnapshot(dateKey, snapshot as unknown as Record<string, unknown>);
      await job.updateProgress(100);
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[PollerProcessor] daily poll failed for ${dateKey}: ${msg}`);
    }
  }

  private mapGameDtoToDailyWire(dateKey: string, g: GameDto): DailyGameStatusWire {
    const gameId: string = String(g.providerGameId ?? '').trim();

    const detailedState: string | null =
      typeof g.detailedState === 'string' && g.detailedState.trim() !== ''
        ? g.detailedState
        : null;

    const phase: DailyPhase = this.mapDailyPhase(g.status, detailedState);

    const inning: number | null = phase === 'LIVE' ? (typeof g.inning === 'number' ? g.inning : null) : null;
    const half: 'top' | 'bottom' | null =
      phase === 'LIVE'
        ? g.half === 'top'
          ? 'top'
          : g.half === 'bottom'
            ? 'bottom'
            : null
        : null;

    const outs: number | null = phase === 'LIVE' ? (typeof g.outs === 'number' ? g.outs : null) : null;

    const statusText: string = this.makeStatusText(phase, inning, half, outs, detailedState);

    // IMPORTANT: scheduled games should not show score column 3; send nulls to UI
    const homeScore: number | null = phase === 'LIVE' || phase === 'FINAL' ? (g.homeScore ?? null) : null;
    const awayScore: number | null = phase === 'LIVE' || phase === 'FINAL' ? (g.awayScore ?? null) : null;

    const startTimeUtc: string | null = this.normalizeStartTimeUtc(g.startTimeUtc);

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
    };
  }

  private mapDailyPhase(status: GameDto['status'], detailedState: string | null): DailyPhase {
    // Edge statuses come from detailedState, even when status is scheduled/live/final.
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

    if (phase === 'SCHEDULED') return ''; // client formats startTimeUtc in local tz

    // fallback
    if (detailedState != null && detailedState.trim() !== '') return detailedState;
    return 'Unknown';
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

  // -----------------------------
  // GAME POLL (your existing logic)
  // -----------------------------

  private async processGamePoll(job: Job<{ gameId: string }>, gameId: string): Promise<void> {
    this.logger.log(
      `[PollerProcessor] START job name=${job.name} id=${job.id} gameId=${gameId}`,
    );

    try {
      const u: LiveUpdate = await this.poller.fetchLatest(gameId);
      const gm: GameMeta = await this.poller.fetchGameMeta(gameId);

      this.logger.debug(
        `[PollerProcessor] meta=${JSON.stringify({
          gameId,
          live: {
            gameDate: u.gameDate,
            homeAbbr: u.homeAbbr,
            awayAbbr: u.awayAbbr,
          },
          meta: {
            gameDate: gm.gameDate,
            homeAbbr: gm.homeAbbr,
            awayAbbr: gm.awayAbbr,
            status: gm.status,
          },
        })}`,
      );

      // --- de-duplicate identical plays by playKey ---
      if (u.playKey != null) {
        const lastKey: string | undefined = this.lastPlayKeyByGame.get(gameId);
        if (lastKey === u.playKey) {
          await job.updateProgress(100);
          return;
        }
        this.lastPlayKeyByGame.set(gameId, u.playKey);
      }

      // Prefer existing DB data if present
      const existing: Game | null = await this.gamesRepo.findOne({
        where: { providerGameId: gameId },
      });

      const todayYmd: string = new Date().toISOString().slice(0, 10);

      // Baseline defaults (prefer cached GameMeta, then LiveUpdate, then DB, then placeholders)
      let gameDate: string = gm.gameDate ?? u.gameDate ?? existing?.gameDate ?? todayYmd;
      let homeAbbr: string = gm.homeAbbr ?? u.homeAbbr ?? existing?.homeAbbr ?? 'HOM';
      let awayAbbr: string = gm.awayAbbr ?? u.awayAbbr ?? existing?.awayAbbr ?? 'AWY';
      let status: Game['status'] =
        (gm.status as Game['status'] | undefined) ?? existing?.status ?? 'live';

      // IMPORTANT: DB expects Date|null
      let startTimeUtc: Date | null = existing?.startTimeUtc ?? null;

      const rawStart: unknown = gm.startTimeUtc ?? u.startTimeUtc;
      if (typeof rawStart === 'string') {
        const d: Date = new Date(rawStart);
        startTimeUtc = Number.isNaN(d.getTime()) ? startTimeUtc : d;
      }

      // --- try to enrich from schedule ---
      const scheduleDates: readonly string[] = this.buildScheduleProbeDates(
        existing?.gameDate ?? gm.gameDate ?? null,
        todayYmd,
      );

      const meta: ScheduleMeta | null = await this.findScheduleMeta(gameId, scheduleDates);

      if (meta != null) {
        gameDate = meta.gameDate ?? gameDate;
        homeAbbr = meta.homeAbbr ?? homeAbbr;
        awayAbbr = meta.awayAbbr ?? awayAbbr;
        status = meta.status ?? status;

        if (typeof meta.startTimeUtc === 'string') {
          const parsed: Date = new Date(meta.startTimeUtc);
          if (!Number.isNaN(parsed.getTime())) {
            startTimeUtc = parsed;
          }
        }
      } else {
        this.logger.debug(
          `[PollerProcessor] schedule meta not found for gameId=${gameId} (tried ${scheduleDates.join(
            ',',
          )})`,
        );
      }

      await this.gamesRepo.upsert(
        {
          providerGameId: gameId,
          gameDate,
          homeAbbr,
          awayAbbr,
          homeName: u.homeName ?? '?',
          awayName: u.awayName ?? '?',
          status,
          startTimeUtc,
          awayScore: u.linescore?.away.runs ?? u.awayScore ?? null,
          homeScore: u.linescore?.home.runs ?? u.homeScore ?? null,
        },
        ['providerGameId'],
      );

      const ts: string = new Date().toISOString();

      if (u.isFinalPitchOfAtBat === true) {
        await this.alerts.onPlay(gameId, { ...u, ts });
      }

      // NEW: emit “point-in-time” R/H/E that matches the *last pitch* snapshot
      const linescore: LinescoreWire | undefined =
        u.linescore != null
          ? {
            away: {
              runs: u.linescore.away.runs,
              hits: u.linescore.away.hits,
              errors: u.linescore.away.errors,
            },
            home: {
              runs: u.linescore.home.runs,
              hits: u.linescore.home.hits,
              errors: u.linescore.home.errors,
            },
          }
          : undefined;

      const payload: PlayUpdateWire = {
        linescore,
        providerGameId: gameId,
        inning: u.inning,
        half: u.half === 'Top' ? 'top' : 'bottom',
        outs: u.outs,
        balls: u.count.balls,
        strikes: u.count.strikes,
        bases: {
          on1: u.bases.on1 === true,
          on2: u.bases.on2 === true,
          on3: u.bases.on3 === true,
        },
        homeScore: u.homeScore ?? 0,
        awayScore: u.awayScore ?? 0,
        description: u.description ?? (u.playResult ?? ''),
        batterName: u.batterName ?? u.batter?.name,
        pitcherName: u.pitcherName ?? u.pitcher?.name,
        batterAvg: u.batterAvg,
        pitcherEra: u.pitcherEra,
        pitchType: u.pitchType,
        pitchSpeedMph: u.pitchSpeedMph,
        ts,
      };

      this.logger.debug(
        `[PollerProcessor] emit playKey=${u.playKey} desc=${payload.description}`,
      );

      this.realtime.publishGameUpdate(gameId, { play: payload });
      this.stats.recordPlay(gameId);

      await job.updateProgress(100);
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : String(err);
      this.logger.warn(`poll failed for game ${gameId}: ${msg}`);
    }
  }

  private buildScheduleProbeDates(
    existingGameDate: string | null,
    todayYmd: string,
  ): readonly string[] {
    const set: Set<string> = new Set<string>();
    set.add(todayYmd);
    if (existingGameDate != null && existingGameDate !== '') {
      set.add(existingGameDate);
    }
    set.add(this.shiftYmd(todayYmd, -1));
    set.add(this.shiftYmd(todayYmd, +1));
    return Array.from(set);
  }

  private shiftYmd(ymd: string, deltaDays: number): string {
    const [yy, mm, dd] = ymd.split('-').map((v: string) => Number(v));
    const d: Date = new Date(yy, mm - 1, dd);
    d.setDate(d.getDate() + deltaDays);
    const yyyy: number = d.getFullYear();
    const m2: string = String(d.getMonth() + 1).padStart(2, '0');
    const d2: string = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${m2}-${d2}`;
  }

  private getProviderGameIdFromScheduleRow(row: GameDto): string | null {
    const candidate: string | undefined = row.providerGameId;
    if (candidate == null || candidate.trim() === '') return null;
    return candidate;
  }

  private async findScheduleMeta(
    gameId: string,
    probeDates: readonly string[],
  ): Promise<ScheduleMeta | null> {
    for (const date of probeDates) {
      const schedule: readonly GameDto[] =
        (await this.mlb.getScheduleByDate(date)) ?? [];

      this.logger.debug(`[PollerProcessor] schedule(${date}) count=${schedule.length}`);

      const metaRow: GameDto | undefined = schedule.find((g: GameDto) => {
        const pid: string | null = this.getProviderGameIdFromScheduleRow(g);
        return pid != null && String(pid) === String(gameId);
      });

      if (metaRow != null) {
        const meta: ScheduleMeta = {
          gameDate:
            typeof metaRow.gameDate === 'string' && metaRow.gameDate !== ''
              ? metaRow.gameDate
              : date,
          homeAbbr:
            typeof metaRow.homeAbbr === 'string' && metaRow.homeAbbr !== ''
              ? metaRow.homeAbbr
              : 'HOM',
          awayAbbr:
            typeof metaRow.awayAbbr === 'string' && metaRow.awayAbbr !== ''
              ? metaRow.awayAbbr
              : 'AWY',
          status: (metaRow.status as Game['status']) ?? 'scheduled',
          startTimeUtc: this.normalizeStartTimeUtc(metaRow.startTimeUtc),
        };

        this.logger.log(
          `[PollerProcessor] schedule meta found for gameId=${gameId} on ${date}: ${meta.awayAbbr}@${meta.homeAbbr}`,
        );

        return meta;
      }
    }

    return null;
  }
}
