import { Injectable } from '@nestjs/common';
import { MlbApiService } from '../providers/mlb/mlb.service';
import { SituationalSplitLine } from './iq.types';

const TTL_MS = 60 * 60 * 1000; // 1 hour — splits don't meaningfully change pitch-to-pitch

@Injectable()
export class SplitsService {
  private readonly cache = new Map<
    string,
    { lines: SituationalSplitLine[]; fetchedAt: number }
  >();

  constructor(private readonly mlb: MlbApiService) {}

  /**
   * RISP + vs-hand splits for a batter, or RISP + vs-hand-allowed for a pitcher.
   * Best-effort: MLB omits a split with too few PAs rather than returning zeros,
   * so callers should treat missing situations as "not enough data" rather than 0.
   */
  async getSplits(
    playerId: number,
    season: number,
    group: 'hitting' | 'pitching',
  ): Promise<SituationalSplitLine[]> {
    const key = `${group}:${playerId}:${season}`;
    const cached = this.cache.get(key);
    if (cached != null && Date.now() - cached.fetchedAt < TTL_MS) {
      return cached.lines;
    }

    const rows = await this.mlb.getSituationalSplits(playerId, season, group, [
      'risp',
      'vl',
      'vr',
    ]);

    const lines: SituationalSplitLine[] = rows.map((r) => ({
      situation: r.description,
      avg: r.avg,
      obp: r.obp,
      slg: r.slg,
      pa: r.plateAppearances,
    }));

    this.cache.set(key, { lines, fetchedAt: Date.now() });
    return lines;
  }
}
