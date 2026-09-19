import { Injectable, Logger } from '@nestjs/common';
import { StandingsService } from '../standings/standings.service';
import { LeadersService } from '../leaders/leaders.service';
import type { StandingTeamDto } from '../standings/dtos/standing-team.dto';
import type {
  SeptemberChaseRow,
  SeptemberRace,
  SeptemberResponse,
  SeptemberTeamRow,
} from './september.types';

// A real 162-game season's worth of games to derive "games remaining" from —
// not read from a schedule (no per-team remaining-games count is exposed
// anywhere in this app today), so this is an approximation: good enough to
// gate early/full mode and to test "mathematically alive" against, not a
// literal magic-number calculation (which also weighs head-to-head games
// against the specific teams still in the race). See PROMPT_home_page.md §8
// ("September's exact early/run-in threshold" is explicitly not designed).
const SEASON_GAMES = 162;
const WILD_CARD_SPOTS = 3;
// Early-season mode switches on a CONDITION (games remaining), not a
// calendar date, per spec. Tunable.
const EARLY_SEASON_GAMES_REMAINING_THRESHOLD = 100;

// Real StandingTeamDto.divisionName values are already short ("AL East",
// "NL West") — confirmed against the live /api/standings response.
const DIVISION_ORDER = ['AL East', 'AL Central', 'AL West', 'NL East', 'NL Central', 'NL West'];

function gamesRemaining(t: StandingTeamDto): number {
  return Math.max(0, SEASON_GAMES - t.wins - t.losses);
}

function pctNum(pct: string): number {
  const n = Number(pct);
  return Number.isFinite(n) ? n : 0;
}

// The real MLB games-back formula — half the combined win/loss differential
// — not `leaderWins - teamWins`, which is only correct when both teams have
// played the same number of games.
function gamesBackOf(team: StandingTeamDto, reference: StandingTeamDto): number {
  return ((reference.wins - team.wins) + (team.losses - reference.losses)) / 2;
}

@Injectable()
export class SeptemberService {
  private readonly log = new Logger(SeptemberService.name);

  constructor(
    private readonly standings: StandingsService,
    private readonly leaders: LeadersService,
  ) {}

  async getSeptember(season: string): Promise<SeptemberResponse> {
    try {
      const teams = await this.standings.getStandings(season);
      const maxGamesRemaining = Math.max(0, ...teams.map(gamesRemaining));
      const mode: SeptemberResponse['mode'] =
        maxGamesRemaining > EARLY_SEASON_GAMES_REMAINING_THRESHOLD ? 'early' : 'full';

      const divisions = this.buildDivisions(teams, mode);
      const wildCards = mode === 'full' ? this.buildWildCards(teams) : [];
      const chases = mode === 'full' ? await this.buildChases(season) : [];

      return { mode, divisions, wildCards, chases };
    } catch (e: unknown) {
      this.log.warn(
        `getSeptember failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      return { mode: 'full', divisions: [], wildCards: [], chases: [] };
    }
  }

  private buildDivisions(
    teams: readonly StandingTeamDto[],
    mode: 'full' | 'early',
  ): SeptemberRace[] {
    const byDivision = new Map<string, StandingTeamDto[]>();
    for (const t of teams) {
      const list = byDivision.get(t.divisionName) ?? [];
      list.push(t);
      byDivision.set(t.divisionName, list);
    }

    return DIVISION_ORDER.filter((d) => byDivision.has(d)).map((divName) => {
      const divTeams = [...(byDivision.get(divName) ?? [])].sort(
        (a, b) => a.rank - b.rank,
      );
      const leader = divTeams[0];
      const alive = divTeams.filter(
        (t) => t.wins + gamesRemaining(t) >= leader.wins,
      );
      const clinched = alive.length === 1 ? leader.abbr : null;

      if (mode === 'early') {
        // Early-season one-liner: leader, record, margin over 2nd — nothing
        // else. A wild-card-style "in/out" read needs a settled field this
        // early doesn't have.
        const second = divTeams[1];
        const margin =
          second != null ? `+${gamesBackOf(second, leader).toFixed(1)}` : '-';
        return {
          title: divName,
          note: '',
          clinchedAbbr: null,
          kind: 'division',
          teamRows: [
            { abbr: leader.abbr, record: `${leader.wins}-${leader.losses}`, gamesBack: margin },
          ],
          chaseRows: [],
        };
      }

      const rows: SeptemberTeamRow[] = alive.map((t) => ({
        abbr: t.abbr,
        record: `${t.wins}-${t.losses}`,
        gamesBack: t === leader ? '-' : t.gamesBack,
      }));

      return {
        title: divName,
        note: `${gamesRemaining(leader)} left`,
        clinchedAbbr: clinched,
        kind: 'division',
        teamRows: rows,
        chaseRows: [],
      };
    });
  }

  private buildWildCards(teams: readonly StandingTeamDto[]): SeptemberRace[] {
    const leagues = ['American League', 'National League'] as const;
    return leagues.map((league) => {
      const inLeague = teams.filter((t) => t.leagueName === league);
      const divisionLeaders = new Set(
        inLeague.filter((t) => t.rank === 1).map((t) => t.abbr),
      );
      const contenders = inLeague
        .filter((t) => !divisionLeaders.has(t.abbr))
        .sort((a, b) => pctNum(b.pct) - pctNum(a.pct));

      const lastIn = contenders[WILD_CARD_SPOTS - 1];
      const firstOut = contenders[WILD_CARD_SPOTS];

      const alive = contenders.filter((t) => {
        const bar = lastIn ?? t;
        return t.wins + gamesRemaining(t) >= bar.wins;
      });

      const rows: SeptemberTeamRow[] = alive.map((t, idx) => {
        const holdingSpot = idx < WILD_CARD_SPOTS;
        let gb = '-';
        if (holdingSpot && firstOut != null && t !== contenders[0]) {
          gb = `+${gamesBackOf(firstOut, t).toFixed(1)}`;
        } else if (!holdingSpot && lastIn != null) {
          gb = gamesBackOf(t, lastIn).toFixed(1);
        }
        return { abbr: t.abbr, record: `${t.wins}-${t.losses}`, gamesBack: gb, holdingSpot };
      });

      const gamesLeft = lastIn != null ? gamesRemaining(lastIn) : 0;
      return {
        title: `${league.startsWith('American') ? 'AL' : 'NL'} Wild Card`,
        note: `${WILD_CARD_SPOTS} spots · ${gamesLeft} left`,
        clinchedAbbr: null,
        kind: 'wildcard' as const,
        teamRows: rows,
        chaseRows: [],
      };
    });
  }

  private async buildChases(season: string): Promise<SeptemberRace[]> {
    const [al, nl, all] = await Promise.all([
      this.leaders.getLeagueLeaders(season, 'AL'),
      this.leaders.getLeagueLeaders(season, 'NL'),
      this.leaders.getLeagueLeaders(season, 'all'),
    ]);

    const topRows = (
      categories: { category: string; leaders: { playerName: string; value: string }[] }[],
      key: string,
    ): SeptemberChaseRow[] =>
      (categories.find((c) => c.category === key)?.leaders ?? [])
        .slice(0, 3)
        .map((l) => ({ playerName: l.playerName, value: l.value }));

    return [
      {
        title: 'AL Batting',
        note: '',
        clinchedAbbr: null,
        kind: 'chase' as const,
        teamRows: [],
        chaseRows: topRows(al.batting, 'battingAverage'),
      },
      {
        title: 'NL Batting',
        note: '',
        clinchedAbbr: null,
        kind: 'chase' as const,
        teamRows: [],
        chaseRows: topRows(nl.batting, 'battingAverage'),
      },
      {
        title: 'Home Runs',
        note: '',
        clinchedAbbr: null,
        kind: 'chase' as const,
        teamRows: [],
        chaseRows: topRows(all.batting, 'homeRuns'),
      },
      {
        title: 'Strikeouts',
        note: '',
        clinchedAbbr: null,
        kind: 'chase' as const,
        teamRows: [],
        // Deliberately pitching strikeouts, standing in for the pitching
        // chase — Cy Young is a vote, not a countable lead, so it's excluded.
        chaseRows: topRows(all.pitching, 'strikeouts'),
      },
    ];
  }
}
