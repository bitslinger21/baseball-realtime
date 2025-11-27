// api/src/poller/poller.service.ts
import { Injectable } from '@nestjs/common';
import { MlbApiService } from '../providers/mlb/mlb.service';
import type { MlbLiveFeed } from '../providers/mlb/mlb.types';

export type LiveUpdate = {
  gameId: string;
  inning: number;
  half: 'Top' | 'Bottom';
  outs: number;
  count: { balls: number; strikes: number };
  bases: { on1?: boolean; on2?: boolean; on3?: boolean };

  // existing nested shapes (used by other code)
  batter?: { id?: number; name?: string };
  pitcher?: { id?: number; name?: string };

  // Fields AlertsService cares about
  batterId?: string;
  batterName?: string;
  pitcherId?: string;
  pitcherName?: string;
  playResult?:
  | 'Single'
  | 'Double'
  | 'Triple'
  | 'HomeRun'
  | 'Walk'
  | 'Strikeout'
  | 'Out'
  | 'HBP'
  | 'Error'
  | 'Other';

  // Used by AlertsService; can be inferred if missing
  creditedHit?: 0 | 1;
  pitcherOutsRecordedThisPlay?: 0 | 1 | 2 | 3;

  // Scoreboard
  homeScore?: number;
  awayScore?: number;

  // Human-readable description
  description?: string;

  snapshot?: unknown;
  meta?: unknown;

  // Stable key for this specific play (inning/half/indices)
  playKey?: string;
};

type MlbPlay = {
  count?: {
    balls?: number;
    strikes?: number;
  };
  matchup?: {
    batter?: { id?: number; fullName?: string };
    pitcher?: { id?: number; fullName?: string };
  };
  result?: {
    description?: string;
    event?: string;
    homeScore?: number;
    awayScore?: number;
  };
  about?: {
    halfInning?: string;
    inning?: number;
    outs?: number;
    isComplete?: boolean;
    // NEW
    atBatIndex?: number;
    playIndex?: number;
  };
};

@Injectable()
export class PollerService {
  constructor(private readonly mlb: MlbApiService) { }

  /**
   * For completed games, we "replay" by walking through liveData.plays.allPlays.
   * This map tracks our current index per gameId.
   */
  private readonly replayIndexByGame = new Map<string, number>();
  /**
   * Track last known outs per game so we can compute
   * pitcherOutsRecordedThisPlay from the delta.
   */
  private readonly lastOutsByGame = new Map<
    string,
    { inning: number; half: 'Top' | 'Bottom'; outs: number }
  >();

  public async fetchLatest(gameId: string): Promise<LiveUpdate> {
    const feed: MlbLiveFeed = await this.mlb.getLiveFeed(gameId);
    const liveData = feed.liveData ?? {};
    const linescore = liveData.linescore ?? {};
    const plays = liveData.plays;

    let playSource: MlbPlay | undefined;

    const allPlays: readonly MlbPlay[] = Array.isArray(plays?.allPlays)
      ? (plays.allPlays as MlbPlay[])
      : [];

    if (allPlays.length > 0) {
      // Filter to "real" completed plays with a batter + event text
      const validPlays: readonly MlbPlay[] = allPlays.filter(
        (p: MlbPlay): boolean =>
          p?.about?.isComplete === true &&
          typeof p.matchup?.batter?.fullName === "string" &&
          (
            typeof p.result?.event === "string" ||
            typeof p.result?.description === "string"
          ),
      );

      const sourceList: readonly MlbPlay[] =
        validPlays.length > 0 ? validPlays : allPlays;

      // Walk forward through the list and wrap when we hit the end
      let idx: number = this.replayIndexByGame.get(gameId) ?? 0;
      if (idx >= sourceList.length) {
        idx = 0;
      }

      playSource = sourceList[idx];

      const nextIdx: number = idx + 1;
      this.replayIndexByGame.set(
        gameId,
        nextIdx >= sourceList.length ? 0 : nextIdx,
      );
    } else {
      // Fallback: current live snapshot
      playSource = plays?.currentPlay as MlbPlay | undefined;
    }

    const currentPlay = playSource ?? {};
    const about = currentPlay.about ?? {};
    const result = currentPlay.result ?? {};
    const countFromPlay = currentPlay.count ?? {};

    // Inning / half / outs
    const inning: number =
      typeof about.inning === 'number'
        ? about.inning
        : Number(linescore.currentInning ?? 0) || 0;

    const half: 'Top' | 'Bottom' =
      about.halfInning === 'top'
        ? 'Top'
        : about.halfInning === 'bottom'
          ? 'Bottom'
          : linescore.isTopInning
            ? 'Top'
            : 'Bottom';

    // Outs: for replay, trust per-play data only.
    const outs: number =
      typeof about.outs === "number" ? about.outs : 0;

    // --- Compute outs recorded on this play (for AlertsService) ---
    let outsOnPlay: 0 | 1 | 2 | 3 = 0;

    const prev = this.lastOutsByGame.get(gameId);

    if (
      prev != null &&
      prev.inning === inning &&
      prev.half === half
    ) {
      const delta = outs - prev.outs;
      if (delta >= 3) {
        outsOnPlay = 3;
      } else if (delta === 2) {
        outsOnPlay = 2;
      } else if (delta === 1) {
        outsOnPlay = 1;
      } else {
        outsOnPlay = 0;
      }
    } else {
      // First play we see for this half-inning; treat as 0
      outsOnPlay = 0;
    }

    // Update last-outs snapshot for next call
    this.lastOutsByGame.set(gameId, { inning, half, outs });

    // Count (balls / strikes): again, per-play only.
    const count = {
      balls: Number(countFromPlay.balls ?? 0) || 0,
      strikes: Number(countFromPlay.strikes ?? 0) || 0,
    };

    const atBatIndex: number | undefined =
      typeof about.atBatIndex === 'number' ? about.atBatIndex : undefined;
    const playIndex: number | undefined =
      typeof about.playIndex === 'number' ? about.playIndex : undefined;

    const playKey: string = [
      inning,
      half,
      atBatIndex ?? 'na',
      playIndex ?? 'na',
    ].join('-');


    // Bases (still using linescore.offense snapshot)
    const offense = linescore.offense ?? {};
    const bases = {
      on1: offense.first != null,
      on2: offense.second != null,
      on3: offense.third != null,
    };

    // Batter / pitcher info
    const batterInfo = currentPlay.matchup?.batter ?? {};
    const pitcherInfo = currentPlay.matchup?.pitcher ?? {};
    const batter = {
      id: batterInfo.id,
      name: batterInfo.fullName,
    };
    const pitcher = {
      id: pitcherInfo.id,
      name: pitcherInfo.fullName,
    };

    const batterId: string | undefined =
      batterInfo.id != null ? String(batterInfo.id) : undefined;
    const batterName: string | undefined = batterInfo.fullName;
    const pitcherId: string | undefined =
      pitcherInfo.id != null ? String(pitcherInfo.id) : undefined;
    const pitcherName: string | undefined = pitcherInfo.fullName;

    // Scoreboard values – prefer per-play score, fall back to linescore totals
    const homeScore: number =
      typeof result.homeScore === 'number'
        ? result.homeScore
        : Number(linescore.teams?.home?.runs ?? linescore.home?.runs ?? 0) ||
        0;

    const awayScore: number =
      typeof result.awayScore === 'number'
        ? result.awayScore
        : Number(linescore.teams?.away?.runs ?? linescore.away?.runs ?? 0) ||
        0;

    // Play result → normalize to our union
    const rawEvent: string | undefined =
      (result.event as string | undefined) ?? undefined;

    const playResult: LiveUpdate['playResult'] = this.mapEventToPlayResult(
      rawEvent,
    );

    const creditedHit: 0 | 1 =
      playResult === 'Single' ||
        playResult === 'Double' ||
        playResult === 'Triple' ||
        playResult === 'HomeRun'
        ? 1
        : 0;

    const description: string | undefined =
      (result.description as string | undefined) ??
      (result.event as string | undefined);

    // TEMP DEBUG
    // eslint-disable-next-line no-console
    console.log(
      "[replay]",
      gameId,
      `inning=${inning}`,
      `half=${half}`,
      `outs=${outs}`,
      `desc=${description}`,
    );

    return {
      gameId,
      inning,
      half,
      outs,
      count,
      bases,

      batter,
      pitcher,

      batterId,
      batterName,
      pitcherId,
      pitcherName,
      playResult,
      creditedHit,
      pitcherOutsRecordedThisPlay: outsOnPlay,

      homeScore,
      awayScore,
      description,
      playKey,
      snapshot: { linescore, currentPlay },
      meta: { gamePk: gameId, ts: Date.now() },
    };
  }

  /**
   * Map MLB result.event to our internal playResult union.
   */
  private mapEventToPlayResult(
    raw: string | undefined,
  ): LiveUpdate['playResult'] {
    if (raw == null) {
      return undefined;
    }

    const v: string = raw.toLowerCase();

    if (v.includes('single')) return 'Single';
    if (v.includes('double')) return 'Double';
    if (v.includes('triple')) return 'Triple';
    if (v.includes('home run') || v === 'home_run' || v === 'homerun')
      return 'HomeRun';

    if (v.includes('walk')) return 'Walk';
    if (v.includes('strikeout') || v === 'strikeout' || v === 'strike out')
      return 'Strikeout';
    if (v.includes('hit by pitch') || v === 'hit_by_pitch') return 'HBP';
    if (v.includes('error')) return 'Error';
    if (v.includes('out')) return 'Out';

    return 'Other';
  }
}