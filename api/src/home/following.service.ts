import { Injectable, Logger } from '@nestjs/common';
import { GamesService } from '../games/games.service';
import { StandingsService } from '../standings/standings.service';
import { PlayersService } from '../players/players.service';
import { MlbApiService } from '../providers/mlb/mlb.service';
import type { FollowRow } from './following.types';

function currentSeasonYear(): string {
  return String(new Date().getFullYear());
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function todayYmdEastern(): string {
  // "Today" rolls at the same boundary the rest of the app uses for a
  // baseball day, not midnight UTC — see PROMPT_home_page.md §6.2.
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/New_York',
  });
}

@Injectable()
export class FollowingService {
  private readonly log = new Logger(FollowingService.name);
  private teamIdCache: { data: Map<string, number>; expiresAt: number } | null =
    null;
  private readonly TTL_TEAM_ID_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly games: GamesService,
    private readonly standings: StandingsService,
    private readonly players: PlayersService,
    private readonly mlb: MlbApiService,
  ) {}

  async getFollowing(
    teamAbbrs: readonly string[],
    playerIds: readonly number[],
  ): Promise<FollowRow[]> {
    const [teamRows, playerRows] = await Promise.all([
      this.followTeams(teamAbbrs),
      Promise.all(playerIds.map((id) => this.followPlayer(id))),
    ]);
    return [...teamRows, ...playerRows];
  }

  private async getTeamId(abbr: string): Promise<number | null> {
    const cached = this.teamIdCache;
    if (cached != null && Date.now() < cached.expiresAt) {
      return cached.data.get(abbr) ?? null;
    }
    try {
      const res = await fetch('https://statsapi.mlb.com/api/v1/teams?sportId=1');
      if (!res.ok) return cached?.data.get(abbr) ?? null;
      const json = (await res.json()) as {
        teams?: { id?: number; abbreviation?: string }[];
      };
      const map = new Map<string, number>();
      for (const t of json.teams ?? []) {
        if (typeof t.id === 'number' && typeof t.abbreviation === 'string') {
          map.set(t.abbreviation, t.id);
        }
      }
      this.teamIdCache = { data: map, expiresAt: Date.now() + this.TTL_TEAM_ID_MS };
      return map.get(abbr) ?? null;
    } catch {
      return cached?.data.get(abbr) ?? null;
    }
  }

  private async nextGameFace(abbr: string): Promise<string> {
    const teamId = await this.getTeamId(abbr);
    if (teamId == null) return 'No game scheduled';
    const upcoming = await this.mlb.getUpcomingForTeam(teamId, 1);
    const next = upcoming[0];
    if (next == null) return 'No game scheduled';
    const opp = next.homeTeamId === teamId ? next.awayAbbr : next.homeAbbr;
    const when =
      next.startTimeUtc != null
        ? new Date(next.startTimeUtc).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : 'TBD';
    return `Next: vs ${opp}, ${when}`;
  }

  private async followTeams(abbrs: readonly string[]): Promise<FollowRow[]> {
    if (abbrs.length === 0) return [];
    try {
      const todayYmd = todayYmdEastern();
      const [todaysGames, standings] = await Promise.all([
        this.games.listByDate(todayYmd),
        this.standings
          .getStandings(currentSeasonYear())
          .catch(() => []),
      ]);

      return await Promise.all(
        abbrs.map(async (abbr) => {
          const game = todaysGames.find(
            (g) => g.homeAbbr === abbr || g.awayAbbr === abbr,
          );
          const standing = standings.find((s) => s.abbr === abbr);
          const name = standing?.displayName ?? abbr;
          const seasonFace =
            standing != null
              ? `${standing.wins}–${standing.losses}, ${ordinal(standing.rank)} in ${standing.divisionName}`
              : 'No data available';

          if (game != null) {
            const isHome = game.homeAbbr === abbr;
            const self = isHome ? game.homeScore : game.awayScore;
            const opp = isHome ? game.awayScore : game.homeScore;
            const opponent = isHome ? game.awayAbbr : game.homeAbbr;

            if (game.status === 'live' || game.status === 'final') {
              const verb =
                (self ?? 0) > (opp ?? 0)
                  ? 'Leading'
                  : (self ?? 0) < (opp ?? 0)
                    ? 'Trailing'
                    : 'Tied with';
              const inningNote =
                game.status === 'live' && game.currentInning != null
                  ? `Inning ${game.currentInning} · `
                  : game.status === 'final'
                    ? 'Final · '
                    : '';
              const face1 = `${inningNote}${verb} ${opponent} ${self ?? 0}–${opp ?? 0}`;
              const faces = [face1, seasonFace];
              if (game.status === 'final') faces.push(await this.nextGameFace(abbr));

              return {
                kind: 'team' as const,
                id: abbr,
                name,
                teamAbbr: abbr,
                state: game.status,
                faces,
                gameId: game.providerGameId ?? null,
                mlbId: null,
              };
            }

            const when =
              game.startTimeUtc != null
                ? new Date(game.startTimeUtc).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'tonight';
            return {
              kind: 'team' as const,
              id: abbr,
              name,
              teamAbbr: abbr,
              state: 'scheduled' as const,
              faces: [`Tonight vs ${opponent}, ${when}`, seasonFace],
              gameId: game.providerGameId ?? null,
              mlbId: null,
            };
          }

          // No game today — season state is face 1, never blank.
          return {
            kind: 'team' as const,
            id: abbr,
            name,
            teamAbbr: abbr,
            state: 'idle' as const,
            faces: [seasonFace, await this.nextGameFace(abbr)],
            gameId: null,
            mlbId: null,
          };
        }),
      );
    } catch (e: unknown) {
      this.log.warn(
        `followTeams failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      return abbrs.map((abbr) => ({
        kind: 'team' as const,
        id: abbr,
        name: abbr,
        teamAbbr: abbr,
        state: 'idle' as const,
        faces: ['No data available'],
        gameId: null,
        mlbId: null,
      }));
    }
  }

  private async followPlayer(mlbId: number): Promise<FollowRow> {
    const result = await this.players.getFollowLine(mlbId);
    return {
      kind: 'player',
      id: String(mlbId),
      name: result.name,
      teamAbbr: result.teamAbbr,
      state: result.state,
      faces: result.faces,
      gameId: result.gameId,
      mlbId,
    };
  }
}
