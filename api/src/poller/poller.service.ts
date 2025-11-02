import { Injectable } from '@nestjs/common';
import { MlbApiService } from '../providers/mlb/mlb.service';

export type LiveUpdate = {
  gameId: string;
  inning: number;
  half: 'Top' | 'Bottom';
  outs: number;
  count: { balls: number; strikes: number };
  bases: { on1?: boolean; on2?: boolean; on3?: boolean };
  batter?: { id?: number; name?: string };
  pitcher?: { id?: number; name?: string };
  snapshot?: any;
  meta?: any;
};

@Injectable()
export class PollerService {
  constructor(private readonly mlb: MlbApiService) {}

  async fetchLatest(gameId: string): Promise<LiveUpdate> {
    const feed = await this.mlb.getLiveFeed(gameId);

    const linescore = feed?.liveData?.linescore ?? {};
    const inning = Number(linescore?.currentInning ?? 0) || 0;
    const half: 'Top' | 'Bottom' = linescore?.isTopInning ? 'Top' : 'Bottom';
    const outs = Number(linescore?.outs ?? 0) || 0;

    const currentPlay = feed?.liveData?.plays?.currentPlay ?? {};
    const count = {
      balls: Number(currentPlay?.count?.balls ?? linescore?.balls ?? 0) || 0,
      strikes: Number(currentPlay?.count?.strikes ?? linescore?.strikes ?? 0) || 0,
    };

    const offense = linescore?.offense ?? {};
    const bases = {
      on1: !!offense?.first,
      on2: !!offense?.second,
      on3: !!offense?.third,
    };

    const batterInfo = currentPlay?.matchup?.batter ?? {};
    const pitcherInfo = currentPlay?.matchup?.pitcher ?? {};
    const batter = { id: batterInfo?.id, name: batterInfo?.fullName };
    const pitcher = { id: pitcherInfo?.id, name: pitcherInfo?.fullName };

    return {
      gameId,
      inning,
      half,
      outs,
      count,
      bases,
      batter,
      pitcher,
      snapshot: { linescore, currentPlay },
      meta: { gamePk: gameId, ts: Date.now() },
    };
  }
}
  