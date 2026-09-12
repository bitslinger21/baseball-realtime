import { Injectable, Logger } from '@nestjs/common';
import { MlbApiService } from '../providers/mlb/mlb.service';
import { BoxScoreService } from '../boxscore/boxscore.service';
import type {
  BoxScoreDto,
  PitcherLineDto,
} from '../boxscore/dtos/boxscore.dto';
import { TeamRecentFormDto } from './dtos/team-recent-form.dto';
import { ipToOuts, eraFrom } from '../common/era.util';

const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class TeamsRecentFormService {
  private readonly log = new Logger(TeamsRecentFormService.name);
  private readonly cache = new Map<
    string,
    { data: TeamRecentFormDto; expiresAt: number }
  >();

  constructor(
    private readonly mlb: MlbApiService,
    private readonly boxScore: BoxScoreService,
  ) {}

  async getRecentForm(
    teamId: number,
    count: number,
  ): Promise<TeamRecentFormDto> {
    const cacheKey = `${teamId}:${count}`;
    const cached = this.cache.get(cacheKey);
    if (cached != null && Date.now() < cached.expiresAt) return cached.data;

    const season = String(new Date().getFullYear());
    const schedule = await this.mlb.getSeasonScheduleForTeam(teamId, season);

    const finals = schedule
      .filter((g) => g.status === 'final' && g.providerGameId != null)
      .sort((a, b) => a.gameDate.localeCompare(b.gameDate))
      .slice(-count);

    const boxscores = await Promise.all(
      finals.map((g) =>
        this.boxScore.getBoxScore(g.providerGameId!).catch((e: unknown) => {
          this.log.warn(
            `boxscore fetch failed for ${g.providerGameId}: ${e instanceof Error ? e.message : String(e)}`,
          );
          return null;
        }),
      ),
    );

    let wins = 0;
    let losses = 0;
    let totalRuns = 0;
    let totalER = 0;
    let totalOuts = 0;
    let bullpenER = 0;
    let bullpenOuts = 0;
    let totalSO = 0;
    let totalBB = 0;
    let totalHR = 0;

    const games: TeamRecentFormDto['games'] = [];

    finals.forEach((g, i) => {
      const scored = g.teamScore ?? 0;
      const allowed = g.oppScore ?? 0;
      const result: 'W' | 'L' = scored > allowed ? 'W' : 'L';
      if (result === 'W') wins++;
      else losses++;
      totalRuns += scored;

      games.push({
        providerGameId: g.providerGameId!,
        gameDate: g.gameDate,
        scored,
        allowed,
        result,
      });

      const box: BoxScoreDto | null = boxscores[i];
      if (box == null) return; // don't let one missing boxscore fabricate the rest

      const mySide = g.isHome ? box.home : box.away;
      const pitchers: PitcherLineDto[] = mySide.pitching;

      for (const p of pitchers) {
        const outs = ipToOuts(p.ip);
        totalER += p.er;
        totalOuts += outs;
        totalSO += p.so;
        totalBB += p.bb;
      }
      // MLB boxscore pitcher order is appearance order — the starter is
      // always first; everyone after is the bullpen for that game.
      for (const p of pitchers.slice(1)) {
        bullpenER += p.er;
        bullpenOuts += ipToOuts(p.ip);
      }

      for (const b of mySide.batting) totalHR += b.hr;
    });

    const gameCount = finals.length;
    const result: TeamRecentFormDto = {
      wins,
      losses,
      runsPerGame:
        gameCount > 0 ? Math.round((totalRuns / gameCount) * 10) / 10 : 0,
      teamEra: eraFrom(totalER, totalOuts),
      bullpenEra: eraFrom(bullpenER, bullpenOuts),
      homeRuns: totalHR,
      strikeouts: totalSO,
      walks: totalBB,
      games,
    };

    this.cache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return result;
  }
}
