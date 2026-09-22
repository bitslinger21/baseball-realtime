import { Injectable, Logger } from '@nestjs/common';
import { StandingsService } from '../standings/standings.service';
import { LeadersService } from '../leaders/leaders.service';
import type { StandingTeamDto } from '../standings/dtos/standing-team.dto';
import type { ChaseGroup, ChaseRow, RaceGroup, RaceTeamRow, RacesResponse } from './races.types';

// A real 162-game season's worth of games to derive "games remaining" from —
// not read from a schedule (no per-team remaining-games count is exposed
// anywhere in this app today). Good enough to gate early/full mode and to
// test "within striking distance" against; see PROMPT_home_layout.md §8
// ("Races' exact early/run-in threshold" is explicitly not designed).
const SEASON_GAMES = 162;
const WILD_CARD_SPOTS = 3;
const EARLY_SEASON_GAMES_REMAINING_THRESHOLD = 100;

// "Mathematically alive" filters nothing in June — every club still
// qualifies. The rule that holds all season is "within striking distance":
// capped at this many games back, UNTIL the true elimination bound (a
// team's own games remaining) shrinks below it late in the season, at which
// point real elimination takes over. One knob, tuned by feel — yields
// roughly 3-4 clubs per division in June per PROMPT_home_layout.md §A7.
const STRIKING_DISTANCE_CAP = 6;

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

function withinStrikingDistance(team: StandingTeamDto, reference: StandingTeamDto): boolean {
  if (team === reference) return true;
  const threshold = Math.min(gamesRemaining(reference), STRIKING_DISTANCE_CAP);
  return gamesBackOf(team, reference) <= threshold;
}

@Injectable()
export class RacesService {
  private readonly log = new Logger(RacesService.name);
  private teamAbbrCache: { data: Map<number, string>; expiresAt: number } | null = null;
  private readonly TTL_TEAM_ABBR_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly standings: StandingsService,
    private readonly leaders: LeadersService,
  ) {}

  async getRaces(season: string): Promise<RacesResponse> {
    try {
      const teams = await this.standings.getStandings(season);
      const maxGamesRemaining = Math.max(0, ...teams.map(gamesRemaining));
      const mode: RacesResponse['mode'] =
        maxGamesRemaining > EARLY_SEASON_GAMES_REMAINING_THRESHOLD ? 'early' : 'full';
      const note = `${maxGamesRemaining} games left in the regular season`;

      const divisions = this.buildDivisions(teams, mode);
      const wildCards = mode === 'full' ? this.buildWildCards(teams) : [];
      const chases = mode === 'full' ? await this.buildChases(season) : [];

      return { mode, note, divisions, wildCards, chases };
    } catch (e: unknown) {
      this.log.warn(`getRaces failed: ${e instanceof Error ? e.message : String(e)}`);
      return { mode: 'full', note: '', divisions: [], wildCards: [], chases: [] };
    }
  }

  private buildDivisions(teams: readonly StandingTeamDto[], mode: 'full' | 'early'): RaceGroup[] {
    const byDivision = new Map<string, StandingTeamDto[]>();
    for (const t of teams) {
      const list = byDivision.get(t.divisionName) ?? [];
      list.push(t);
      byDivision.set(t.divisionName, list);
    }

    return DIVISION_ORDER.filter((d) => byDivision.has(d)).map((divName) => {
      const divTeams = [...(byDivision.get(divName) ?? [])].sort((a, b) => a.rank - b.rank);
      const leader = divTeams[0];
      const alive = divTeams.filter((t) => withinStrikingDistance(t, leader));
      const clinched = alive.length === 1 ? leader.abbr : null;

      if (mode === 'early') {
        // Six division one-liners — leader, record, margin over 2nd, in
        // prose ("leads by 2.0" / "tied at the top"), never a bare signed
        // number beside a record (that read as a second record).
        const second = divTeams[1];
        const gb = second != null ? gamesBackOf(second, leader) : 0;
        const marginNote = second == null || gb === 0 ? 'tied at the top' : `leads by ${gb.toFixed(1)}`;
        return {
          title: divName,
          note: marginNote,
          clinchedAbbr: null,
          kind: 'division',
          rows: [
            { abbr: leader.abbr, displayName: leader.displayName, record: `${leader.wins}-${leader.losses}`, gamesBack: '-' },
          ],
        };
      }

      const rows: RaceTeamRow[] = alive.map((t) => ({
        abbr: t.abbr,
        displayName: t.displayName,
        record: `${t.wins}-${t.losses}`,
        gamesBack: t === leader ? '-' : t.gamesBack,
      }));

      return {
        title: divName,
        note: `${gamesRemaining(leader)} left`,
        clinchedAbbr: clinched,
        kind: 'division',
        rows,
      };
    });
  }

  private buildWildCards(teams: readonly StandingTeamDto[]): RaceGroup[] {
    const leagues = ['American League', 'National League'] as const;
    return leagues.map((league) => {
      const inLeague = teams.filter((t) => t.leagueName === league);
      const divisionLeaders = new Set(inLeague.filter((t) => t.rank === 1).map((t) => t.abbr));
      const contenders = inLeague
        .filter((t) => !divisionLeaders.has(t.abbr))
        .sort((a, b) => pctNum(b.pct) - pctNum(a.pct));

      const lastIn = contenders[WILD_CARD_SPOTS - 1];
      const firstOut = contenders[WILD_CARD_SPOTS];

      const alive = lastIn != null
        ? contenders.filter((t) => withinStrikingDistance(t, lastIn))
        : contenders;

      const rows: RaceTeamRow[] = alive.map((t, idx) => {
        const holdingSpot = idx < WILD_CARD_SPOTS;
        // Clinched a berth: the first team currently out can no longer catch
        // this one even within the (generous) striking-distance cap — reads
        // as a green "IN", not a bare number in a mono tabular column, where
        // it looked like a data glitch.
        const clinchedSpot = holdingSpot && firstOut != null && !withinStrikingDistance(firstOut, t);
        let gb = '-';
        if (clinchedSpot) {
          gb = 'IN';
        } else if (holdingSpot && firstOut != null && t !== contenders[0]) {
          gb = `+${gamesBackOf(firstOut, t).toFixed(1)}`;
        } else if (!holdingSpot && lastIn != null) {
          gb = gamesBackOf(t, lastIn).toFixed(1);
        }
        return { abbr: t.abbr, displayName: t.displayName, record: `${t.wins}-${t.losses}`, gamesBack: gb, holdingSpot };
      });

      const gamesLeft = lastIn != null ? gamesRemaining(lastIn) : 0;
      return {
        title: `${league.startsWith('American') ? 'AL' : 'NL'} Wild Card`,
        note: `${WILD_CARD_SPOTS} spots · ${gamesLeft} left`,
        clinchedAbbr: null,
        kind: 'wildcard' as const,
        rows,
      };
    });
  }

  private async getTeamAbbr(teamId: number): Promise<string | null> {
    const cached = this.teamAbbrCache;
    if (cached != null && Date.now() < cached.expiresAt) return cached.data.get(teamId) ?? null;
    try {
      const res = await fetch('https://statsapi.mlb.com/api/v1/teams?sportId=1');
      if (!res.ok) return cached?.data.get(teamId) ?? null;
      const json = (await res.json()) as { teams?: { id?: number; abbreviation?: string }[] };
      const map = new Map<number, string>();
      for (const t of json.teams ?? []) {
        if (typeof t.id === 'number' && typeof t.abbreviation === 'string') map.set(t.id, t.abbreviation);
      }
      this.teamAbbrCache = { data: map, expiresAt: Date.now() + this.TTL_TEAM_ABBR_MS };
      return map.get(teamId) ?? null;
    } catch {
      return cached?.data.get(teamId) ?? null;
    }
  }

  private async buildChases(season: string): Promise<ChaseGroup[]> {
    const [al, nl] = await Promise.all([
      this.leaders.getLeagueLeaders(season, 'AL'),
      this.leaders.getLeagueLeaders(season, 'NL'),
    ]);

    const topRows = async (
      categories: { category: string; leaders: { playerName: string; teamId: number; value: string }[] }[],
      key: string,
    ): Promise<ChaseRow[]> => {
      const leaders = (categories.find((c) => c.category === key)?.leaders ?? []).slice(0, 3);
      return Promise.all(
        leaders.map(async (l) => ({
          playerName: l.playerName,
          teamAbbr: await this.getTeamAbbr(l.teamId),
          value: l.value,
        })),
      );
    };

    const [
      alBatting, alHomeRuns, alRbi,
      nlBatting, nlHomeRuns, nlRbi,
      alStrikeouts, alEra, alSaves,
      nlStrikeouts, nlEra, nlSaves,
    ] = await Promise.all([
      topRows(al.batting, 'battingAverage'),
      topRows(al.batting, 'homeRuns'),
      topRows(al.batting, 'runsBattedIn'),
      topRows(nl.batting, 'battingAverage'),
      topRows(nl.batting, 'homeRuns'),
      topRows(nl.batting, 'runsBattedIn'),
      topRows(al.pitching, 'strikeouts'),
      topRows(al.pitching, 'earnedRunAverage'),
      topRows(al.pitching, 'saves'),
      topRows(nl.pitching, 'strikeouts'),
      topRows(nl.pitching, 'earnedRunAverage'),
      topRows(nl.pitching, 'saves'),
    ]);

    // Cy Young is deliberately absent — an award VOTE, not a countable
    // lead. Saves are in despite being a poor measure of a season, because
    // every chase row here is a number you can check. Both Hitting and
    // Pitching split into AL/NL sub-groups now, for the same reason: the
    // 'all' leaderboard was always just AL+NL merged and re-ranked, which
    // reads as one number when it's really two separate races.
    return [
      { title: 'Batting Average', kind: 'chase' as const, group: 'hitting' as const, league: 'AL' as const, rows: alBatting },
      { title: 'Home Runs', kind: 'chase' as const, group: 'hitting' as const, league: 'AL' as const, rows: alHomeRuns },
      { title: 'RBI', kind: 'chase' as const, group: 'hitting' as const, league: 'AL' as const, rows: alRbi },
      { title: 'Batting Average', kind: 'chase' as const, group: 'hitting' as const, league: 'NL' as const, rows: nlBatting },
      { title: 'Home Runs', kind: 'chase' as const, group: 'hitting' as const, league: 'NL' as const, rows: nlHomeRuns },
      { title: 'RBI', kind: 'chase' as const, group: 'hitting' as const, league: 'NL' as const, rows: nlRbi },
      { title: 'Strikeouts', kind: 'chase' as const, group: 'pitching' as const, league: 'AL' as const, rows: alStrikeouts },
      { title: 'ERA', kind: 'chase' as const, group: 'pitching' as const, league: 'AL' as const, rows: alEra },
      { title: 'Saves', kind: 'chase' as const, group: 'pitching' as const, league: 'AL' as const, rows: alSaves },
      { title: 'Strikeouts', kind: 'chase' as const, group: 'pitching' as const, league: 'NL' as const, rows: nlStrikeouts },
      { title: 'ERA', kind: 'chase' as const, group: 'pitching' as const, league: 'NL' as const, rows: nlEra },
      { title: 'Saves', kind: 'chase' as const, group: 'pitching' as const, league: 'NL' as const, rows: nlSaves },
    ];
  }
}
