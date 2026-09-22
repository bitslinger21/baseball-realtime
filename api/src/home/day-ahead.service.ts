import { Injectable, Logger } from '@nestjs/common';
import { GamesService } from '../games/games.service';
import { StandingsService } from '../standings/standings.service';
import type { StandingTeamDto } from '../standings/dtos/standing-team.dto';
import type { DayAheadResponse, DayAheadRow } from './day-ahead.types';

const HOME_TODAY_COUNT = 4;

// A small, real, well-known set — not exhaustive, just enough to give the
// "rivalry" trigger something to fire on without inventing a claim.
const RIVALRIES = new Set([
  'NYY-BOS', 'HOU-TEX', 'LAD-SF', 'CHC-STL', 'NYM-ATL', 'LAA-LAD',
  'CWS-CHC', 'PIT-CLE', 'SD-LAD', 'BAL-WSH', 'DET-CLE', 'OAK-SF',
]);

function rivalryKey(a: string, b: string): string {
  return [a, b].sort().join('-');
}

function todayYmdEastern(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

function gbNumber(s: string): number {
  if (s === '-' || s.trim() === '') return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 99;
}

@Injectable()
export class DayAheadService {
  private readonly log = new Logger(DayAheadService.name);

  constructor(
    private readonly games: GamesService,
    private readonly standings: StandingsService,
  ) {}

  async getDayAhead(season: string): Promise<DayAheadResponse> {
    try {
      const [todaysGames, standingsList] = await Promise.all([
        this.games.listByDate(todayYmdEastern()),
        this.standings.getStandings(season).catch(() => [] as StandingTeamDto[]),
      ]);

      const byAbbr = new Map(standingsList.map((s) => [s.abbr, s]));

      const scored = todaysGames.map((g) => {
        const home = byAbbr.get(g.homeAbbr);
        const away = byAbbr.get(g.awayAbbr);
        let score = 0;
        let stake: string | null = null;

        if (RIVALRIES.has(rivalryKey(g.homeAbbr, g.awayAbbr))) {
          score += 40;
          stake = 'Rivalry';
        }

        if (home != null && away != null && home.divisionName === away.divisionName) {
          const proximity = 30 - Math.min(gbNumber(home.gamesBack), gbNumber(away.gamesBack));
          if (proximity > score) {
            score = Math.max(score, proximity);
            stake = `${home.divisionName} race`;
          } else {
            score += Math.max(0, proximity * 0.3);
          }
        }

        // A team within a game of first anywhere (division OR still-alive
        // wild-card shape) is itself a real, checkable stake worth surfacing
        // even without a shared-division opponent.
        for (const s of [home, away]) {
          if (s != null && gbNumber(s.gamesBack) <= 1) {
            score += 15;
            stake ??= `${s.divisionName} race`;
          }
        }

        return { game: g, score, stake };
      });

      scored.sort((a, b) => b.score - a.score);
      const top = scored.slice(0, HOME_TODAY_COUNT);

      const rows: DayAheadRow[] = top.map(({ game, stake }) => ({
        providerGameId: game.providerGameId ?? '',
        awayAbbr: game.awayAbbr,
        homeAbbr: game.homeAbbr,
        startTimeUtc:
          game.startTimeUtc != null ? new Date(game.startTimeUtc).toISOString() : null,
        awayPitcherName: game.awayProbable?.name ?? null,
        homePitcherName: game.homeProbable?.name ?? null,
        stake,
      }));

      return { games: rows, totalCount: todaysGames.length };
    } catch (e: unknown) {
      this.log.warn(`getDayAhead failed: ${e instanceof Error ? e.message : String(e)}`);
      return { games: [], totalCount: 0 };
    }
  }
}
