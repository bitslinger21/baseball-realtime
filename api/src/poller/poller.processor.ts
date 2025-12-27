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
import type { GameDto } from 'src/games/dtos/game.dto';

type PlayUpdateWire = {
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

  public async process(job: Job<{ gameId: string }>): Promise<void> {
    const { gameId } = job.data;

    this.logger.log(
      `[PollerProcessor] START job name=${job.name} id=${job.id} gameId=${gameId}`,
    );

    try {
      const u: LiveUpdate = await this.poller.fetchLatest(gameId);
      const gm: GameMeta = await this.poller.fetchGameMeta(gameId);

      this.logger.debug(
        `[PollerProcessor] meta=${JSON.stringify({
          gameId,
          live: { gameDate: u.gameDate, homeAbbr: u.homeAbbr, awayAbbr: u.awayAbbr },
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
        },
        ['providerGameId'],
      );

      const ts: string = new Date().toISOString();

      if (u.isFinalPitchOfAtBat === true) {
        await this.alerts.onPlay(gameId, { ...u, ts });
      }

      const payload: PlayUpdateWire = {
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
    } catch (err) {
      this.logger.warn(`poll failed for game ${gameId}: ${(err as Error).message}`);
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
    // Be defensive re DTO shape:
    const anyRow = row as unknown as Record<string, unknown>;

    const candidate: unknown =
      anyRow.providerGameId ??
      anyRow.gamePk ??
      anyRow.gameId ??
      anyRow.id ??
      anyRow.game_id;

    if (candidate == null) return null;
    return String(candidate);
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
        const anyRow = metaRow as unknown as Record<string, unknown>;

        const meta: ScheduleMeta = {
          gameDate:
            typeof anyRow.gameDate === 'string' && anyRow.gameDate !== ''
              ? anyRow.gameDate
              : date,
          homeAbbr:
            typeof anyRow.homeAbbr === 'string' && anyRow.homeAbbr !== ''
              ? anyRow.homeAbbr
              : 'HOM',
          awayAbbr:
            typeof anyRow.awayAbbr === 'string' && anyRow.awayAbbr !== ''
              ? anyRow.awayAbbr
              : 'AWY',
          status: (anyRow.status as Game['status']) ?? 'scheduled',
          startTimeUtc: this.normalizeStartTimeUtc(anyRow.startTimeUtc),
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
