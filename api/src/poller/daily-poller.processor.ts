import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { MlbApiService } from '../providers/mlb/mlb.service';
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
