import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { Game } from '../persistence/entities/game.entity';
import {
  PollerService,
  type GameMeta,
  type LiveUpdate,
  type RunnerMove,
  type Spray,
} from './poller.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { PollerProducer } from './poller.producer';
import { MlbApiService } from '../providers/mlb/mlb.service';
import { GameDto } from '../games/dtos/game.dto';
import { IqService } from '../iq/iq.service';
import type { IqBlock } from '../iq/iq.types';
import { HotEventsService } from '../home/hot-events.service';
import { ClipsService } from '../clips/clips.service';

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
  status?: 'live' | 'final' | 'scheduled';
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
  runnerOutBase?: '1B' | '2B' | '3B';
  onBaseFirst?: string;
  onBaseSecond?: string;
  onBaseThird?: string;
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
  iq?: IqBlock;
  // true only on an at-bat's last frame (a pitchless play's single frame
  // included) — PROMPT_bug_fixes_oct9.md A2.
  isFinalPitchOfAtBat: boolean;
  // MLB's runner movements attached to this frame (A5).
  runners: RunnerMove[];
  // F-006: where the ball went, and the fielders under an FC code.
  spray?: Spray;
  scorebookSub?: string;
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

@Processor('game-poller', { concurrency: 5, lockDuration: 60000 })
@Injectable()
export class PollerProcessor extends WorkerHost {
  private readonly logger: Logger = new Logger(PollerProcessor.name);
  // What each pitch looked like when it was last broadcast, per game:
  // playKey → content fingerprint. A tick sends every pitch that is new OR
  // whose content changed since — MLB fills in an at-bat's result (complete,
  // outs, the play) on the SAME pitch a few seconds after first publishing
  // it, and sending only pitches newer than the last one sent left every
  // at-bat open in the browser until a refresh.
  private readonly sentByGame: Map<string, Map<string, string>> = new Map();

  public constructor(
    private readonly poller: PollerService,
    private readonly realtime: RealtimeGateway,
    @InjectRepository(Game) private readonly gamesRepo: Repository<Game>,
    private readonly mlb: MlbApiService,
    private readonly iq: IqService,
    private readonly hotEvents: HotEventsService,
    private readonly clips: ClipsService,
    private readonly producer: PollerProducer,
  ) {
    super();
  }

  public async process(job: Job<PollJobData>): Promise<void> {
    const data: PollJobData = job.data;

    const gameId: string | null =
      'gameId' in data &&
      typeof data.gameId === 'string' &&
      data.gameId.trim() !== ''
        ? data.gameId.trim()
        : null;

    if (gameId == null) {
      this.logger.warn(
        `[PollerProcessor] game job missing gameId name=${job.name} id=${job.id}`,
      );
      return;
    }

    await this.processGamePoll(
      job as unknown as Job<{ gameId: string }>,
      gameId,
    );
  }

  // One pitch's identity across ticks.
  private frameKey(gameId: string, u: LiveUpdate): string {
    return typeof u.playKey === 'string' && u.playKey.trim() !== ''
      ? u.playKey.trim()
      : this.buildEventKey(gameId, u);
  }

  // What the client shows for one pitch, from that pitch's own play only.
  // Game-wide values every frame carries (linescore, today's box-score line,
  // season stats) are left out — they change for every frame at once and
  // would resend the whole game each time a run scores.
  private frameSig(u: LiveUpdate): string {
    return JSON.stringify([
      u.description,
      u.outs,
      u.count?.balls,
      u.count?.strikes,
      u.bases?.on1,
      u.bases?.on2,
      u.bases?.on3,
      u.playResult,
      u.creditedHit,
      u.hitKind,
      u.isFinalPitchOfAtBat,
      u.scorebookCode,
      u.runnerOutBase,
      u.onBaseFirst,
      u.onBaseSecond,
      u.onBaseThird,
      u.homeScore,
      u.awayScore,
      u.pitchType,
      u.pitchSpeedMph,
      u.pitchX,
      u.pitchZ,
      u.homeTeamWinProbability,
      u.leverageIndex,
      // a steal published after this pitch rides on it (A5)
      u.runners,
      u.spray,
      u.scorebookSub,
    ]);
  }

  private buildEventKey(gameId: string, u: LiveUpdate): string {
    // Prefer server-provided stable key if it truly identifies a single pitch/event.
    const playKey: string | null =
      typeof u.playKey === 'string' && u.playKey.trim() !== ''
        ? u.playKey.trim()
        : null;

    // Normalize the minimal “identity” of what the UI is showing.
    const inning: string = String(u.inning);
    const half: string = String(u.half); // 'Top' | 'Bottom' per your code
    const outs: string = String(u.outs);
    const balls: string = String(u.count?.balls ?? '');
    const strikes: string = String(u.count?.strikes ?? '');

    const batter: string = String(u.batterName ?? u.batter?.name ?? '').trim();
    const pitcher: string = String(
      u.pitcherName ?? u.pitcher?.name ?? '',
    ).trim();

    const desc: string = String(u.description ?? u.playResult ?? '').trim();

    const pitchType: string = String(u.pitchType ?? '').trim();
    const pitchSpeed: string =
      u.pitchSpeedMph != null ? String(u.pitchSpeedMph) : '';

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

  private async processGamePoll(
    job: Job<{ gameId: string }>,
    gameId: string,
  ): Promise<void> {
    this.logger.debug(
      `[PollerProcessor] START job name=${job.name} id=${job.id} gameId=${gameId}`,
    );

    try {
      const { latest: u, history } =
        await this.poller.fetchLatestWithHistory(gameId);
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

      // --- what to broadcast: new pitches, and pitches whose content changed ---
      // First tick for a game (or after a restart): remember everything and
      // send only the latest — never replay a whole game's history into a
      // live room (joiners get the full list via hydrate).
      let sent = this.sentByGame.get(gameId);
      const toSend: LiveUpdate[] = [];
      if (sent == null) {
        sent = new Map(
          history.map((h) => [this.frameKey(gameId, h), this.frameSig(h)]),
        );
        this.sentByGame.set(gameId, sent);
        toSend.push(u);
      } else {
        for (const h of history.length > 0 ? history : [u]) {
          if (sent.get(this.frameKey(gameId, h)) !== this.frameSig(h))
            toSend.push(h);
        }
      }

      if (toSend.length === 0) {
        // A viewer's 3s poll ('poll') of a game that is over, with every
        // pitch already sent, has nothing left to do — the viewer got the
        // whole game in `hydrate`. Stop it rather than refetch the feed every
        // 3s for as long as the page stays open. Seeded polls ('poll-game')
        // keep their post-final tail for clip ingest (PollerBootstrapService).
        if (job.name === 'poll' && u.status === 'final') {
          await this.producer.removeGamePoll(gameId);
          this.logger.log(
            `[PollerProcessor] game ${gameId} is final — stopped its viewer poll`,
          );
        }
        await job.updateProgress(100);
        return;
      }

      // Prefer existing DB data if present
      const existing: Game | null = await this.gamesRepo.findOne({
        where: { providerGameId: gameId },
      });

      const todayYmd: string = new Date().toISOString().slice(0, 10);

      // Baseline defaults (prefer cached GameMeta, then LiveUpdate, then DB, then placeholders)
      let gameDate: string =
        gm.gameDate ?? u.gameDate ?? existing?.gameDate ?? todayYmd;
      let homeAbbr: string =
        gm.homeAbbr ?? u.homeAbbr ?? existing?.homeAbbr ?? '?';
      let awayAbbr: string =
        gm.awayAbbr ?? u.awayAbbr ?? existing?.awayAbbr ?? '?';
      if (homeAbbr === '?' || awayAbbr === '?') {
        this.logger.warn(
          `[PollerProcessor] missing team abbreviation for game ${gameId} (home=${homeAbbr}, away=${awayAbbr})`,
        );
      }
      let status: Game['status'] = gm.status ?? existing?.status ?? 'live';

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

      const meta: ScheduleMeta | null = await this.findScheduleMeta(
        gameId,
        scheduleDates,
      );

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

      // Every new or changed pitch, in game order (toSend, above). The client
      // replaces a pitch it already has by playKey.
      for (const frame of toSend) {
        sent.set(this.frameKey(gameId, frame), this.frameSig(frame));

        const payload: PlayUpdateWire = this.buildPlayPayload(
          gameId,
          frame,
          status,
          ts,
        );

        this.logger.debug(
          `[PollerProcessor] emit playKey=${frame.playKey} desc=${payload.description}`,
        );

        this.realtime.publishGameUpdate(gameId, { play: payload });
      }

      if (status === 'live' && u.atBatIndex != null) {
        const atBatIndex = u.atBatIndex;
        this.iq
          .maybeGenerate(gameId, u, history)
          .then((iq: IqBlock | undefined) => {
            if (
              iq != null &&
              (iq.candidates.length > 0 || iq.suggested.length > 0)
            ) {
              this.realtime.publishIqUpdate(gameId, atBatIndex, iq);
            }
          })
          .catch((e: unknown) => {
            this.logger.warn(
              `[PollerProcessor] iq generation failed for ${gameId}: ${e instanceof Error ? e.message : String(e)}`,
            );
          });
      }

      // Independent consumer of the same tick data — "What's Hot Right Now"
      // detection. Synchronous/in-memory, so no promise handling needed; the
      // service guards its own live/final check and catches detector errors.
      this.hotEvents.observe(gameId, u, history);

      // Video clip ingest — self-throttles internally (PROMPT_video_clips.md
      // §6a), so it's safe to call every tick for every game.
      this.clips.maybeIngest(gameId, status).catch((e: unknown) => {
        this.logger.warn(
          `[PollerProcessor] clip ingest failed for ${gameId}: ${e instanceof Error ? e.message : String(e)}`,
        );
      });

      await job.updateProgress(100);
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : String(err);
      this.logger.warn(`poll failed for game ${gameId}: ${msg}`);
    }
  }

  // Extracted so a burst of ≥2 new pitches in one poll tick can build a wire
  // payload per frame instead of only ever for the latest.
  private buildPlayPayload(
    gameId: string,
    u: LiveUpdate,
    status: Game['status'],
    ts: string,
  ): PlayUpdateWire {
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

    return {
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
      description: u.description ?? u.playResult ?? '',
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
      isFinalPitchOfAtBat: u.isFinalPitchOfAtBat === true,
      runners: u.runners ?? [],
      spray: u.spray,
      scorebookSub: u.scorebookSub,
      scorebookCode: u.scorebookCode,
      runnerOutBase: u.runnerOutBase,
      onBaseFirst: u.onBaseFirst,
      onBaseSecond: u.onBaseSecond,
      onBaseThird: u.onBaseThird,
      batterId: u.batterId != null ? Number(u.batterId) : undefined,
      pitchX: u.pitchX,
      pitchZ: u.pitchZ,
      strikeZoneTop: u.strikeZoneTop,
      strikeZoneBottom: u.strikeZoneBottom,
      batterGameAB: u.batterGameAB,
      batterGameH: u.batterGameH,
      batterGameR: u.batterGameR,
      batterGameRBI: u.batterGameRBI,
      status,
      // iq is never set synchronously here — see the fire-and-forget
      // generation below. A triggering play (e.g. a home run) must land
      // instantly; the insight arriving a beat later via a follow-up patch
      // costs nothing, since the bar only gains a line, it never moves.
    };
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
    // Fetch all probe dates concurrently — the serial loop was the primary cause of
    // lock-expiry errors (up to 4 sequential MLB API calls per poll tick).
    const settled = await Promise.all(
      probeDates.map((date) =>
        this.mlb
          .getScheduleByDate(date)
          .then((schedule): { date: string; schedule: readonly GameDto[] } => ({
            date,
            schedule: schedule ?? [],
          }))
          .catch((): null => null),
      ),
    );

    // Respect the original priority order: return the match from the earliest probe date.
    for (const result of settled) {
      if (result == null) continue;
      const { date, schedule } = result;

      this.logger.debug(
        `[PollerProcessor] schedule(${date}) count=${schedule.length}`,
      );

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
              : '?',
          awayAbbr:
            typeof metaRow.awayAbbr === 'string' && metaRow.awayAbbr !== ''
              ? metaRow.awayAbbr
              : '?',
          status: metaRow.status ?? 'scheduled',
          startTimeUtc: this.normalizeStartTimeUtc(metaRow.startTimeUtc),
        };

        if (meta.homeAbbr === '?' || meta.awayAbbr === '?') {
          this.logger.warn(
            `[PollerProcessor] schedule row for gameId=${gameId} missing a team abbreviation (home=${meta.homeAbbr}, away=${meta.awayAbbr})`,
          );
        }

        this.logger.debug(
          `[PollerProcessor] schedule meta found for gameId=${gameId} on ${date}: ${meta.awayAbbr}@${meta.homeAbbr}`,
        );

        return meta;
      }
    }

    return null;
  }
}
