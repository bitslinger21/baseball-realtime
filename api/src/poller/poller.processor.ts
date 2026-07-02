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
import { MlbApiService } from '../providers/mlb/mlb.service';
import { GameDto } from '../games/dtos/game.dto';
import { BroadcastDirectorService } from '../broadcast/director/broadcast-director.service';


export type TeamRheWire = {
  runs: number;
  hits: number;
  errors: number;
};

export type LinescoreWire = {
  away: TeamRheWire;
  home: TeamRheWire;
  inningRuns?: {
    away: (number | null)[];
    home: (number | null)[];
  };
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
  pitchTypeCode?: string;
  pitchSpeedMph?: number;
  atBatIndex?: number;
  playResult?: string;
  scorebookCode?: string;
  batterId?: number;
  pitchX?: number;
  pitchZ?: number;
  strikeZoneTop?: number;
  strikeZoneBottom?: number;
  batterGameAB?: number;
  batterGameH?: number;
  batterGameR?: number;
  batterGameRBI?: number;
  playKey?: string;
  homeTeamWinProbability?: number;
  leverageIndex?: number;
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
  // backward compat: existing repeatables may still send { gameId }
  | { gameId: string };

@Processor('game-poller', { concurrency: 5 })
@Injectable()
export class PollerProcessor extends WorkerHost {
  private readonly logger: Logger = new Logger(PollerProcessor.name);
  private readonly lastEventKeyByGame: Map<string, string> = new Map();

  public constructor(
    private readonly poller: PollerService,
    private readonly realtime: RealtimeGateway,
    private readonly alerts: AlertsService,
    @InjectRepository(Game) private readonly gamesRepo: Repository<Game>,
    private readonly stats: StatsService,
    private readonly mlb: MlbApiService,
    private readonly broadcastDirector: BroadcastDirectorService,
  ) {
    super();
  }

  public async process(job: Job<PollJobData>): Promise<void> {
    const data: PollJobData = job.data;

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

  private buildEventKey(gameId: string, u: LiveUpdate): string {
    // Prefer server-provided stable key if it truly identifies a single pitch/event.
    const playKey: string | null =
      typeof u.playKey === 'string' && u.playKey.trim() !== '' ? u.playKey.trim() : null;

    // Normalize the minimal “identity” of what the UI is showing.
    const inning: string = String(u.inning);
    const half: string = String(u.half); // 'Top' | 'Bottom' per your code
    const outs: string = String(u.outs);
    const balls: string = String(u.count?.balls ?? '');
    const strikes: string = String(u.count?.strikes ?? '');

    const batter: string = String(u.batterName ?? u.batter?.name ?? '').trim();
    const pitcher: string = String(u.pitcherName ?? u.pitcher?.name ?? '').trim();

    const desc: string = String(u.description ?? u.playResult ?? '').trim();

    const pitchType: string = String(u.pitchType ?? '').trim();
    const pitchSpeed: string = u.pitchSpeedMph != null ? String(u.pitchSpeedMph) : '';

    // Build a composite key. If playKey is stable, it will dominate; otherwise composite dominates.
    // Including description/count avoids replaying the same historical sequence.
    const composite: string =
      `${gameId}|inn=${inning}|half=${half}|outs=${outs}|` +
      `c=${balls}-${strikes}|b=${batter}|p=${pitcher}|` +
      `t=${pitchType}|v=${pitchSpeed}|d=${desc}`;

    return playKey != null ? `${composite}|pk=${playKey}` : composite;
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
    this.logger.debug(
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

      // --- de-duplicate identical point-in-time updates (prevents pitch replay spam) ---
      const eventKey: string = this.buildEventKey(gameId, u);
      const lastKey: string | undefined = this.lastEventKeyByGame.get(gameId);

      if (lastKey === eventKey) {
        await job.updateProgress(100);
        return;
      }

      this.lastEventKeyByGame.set(gameId, eventKey);

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

      // NEW: emit “point-in-time” R/H/E + per-inning runs that match the *last pitch* snapshot
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
            inningRuns: u.linescore.inningRuns,
          }
          : undefined;

      const payload: PlayUpdateWire = {
        linescore,
        providerGameId: gameId,
        inning: u.inning,
        half: u.half === "Top" ? "top" : "bottom",
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
        description: u.description ?? (u.playResult ?? ""),
        batterName: u.batterName ?? u.batter?.name,
        pitcherName: u.pitcherName ?? u.pitcher?.name,
        batterAvg: u.batterAvg,
        pitcherEra: u.pitcherEra,
        pitchType: u.pitchType,
        pitchTypeCode: u.pitchTypeCode,
        pitchSpeedMph: u.pitchSpeedMph,
        ts,
        playKey: u.playKey,
        atBatIndex: u.atBatIndex,
        playResult: u.playResult,
        scorebookCode: u.scorebookCode,
        batterId: u.batterId != null ? Number(u.batterId) : undefined,
        pitchX: u.pitchX,
        pitchZ: u.pitchZ,
        strikeZoneTop: u.strikeZoneTop,
        strikeZoneBottom: u.strikeZoneBottom,
        batterGameAB: u.batterGameAB,
        batterGameH: u.batterGameH,
        batterGameR: u.batterGameR,
        batterGameRBI: u.batterGameRBI,
      };

      this.logger.debug(
        `[PollerProcessor] emit playKey=${u.playKey} desc=${payload.description}`,
      );

      this.realtime.publishGameUpdate(gameId, { play: payload });
      void this.broadcastDirector.onPlay(gameId, u, payload);
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

        this.logger.debug(
          `[PollerProcessor] schedule meta found for gameId=${gameId} on ${date}: ${meta.awayAbbr}@${meta.homeAbbr}`,
        );

        return meta;
      }
    }

    return null;
  }
}
