import { Injectable, Logger } from '@nestjs/common';
import { GamesService } from '../games/games.service';
import { StandingsService } from '../standings/standings.service';
import { PlayersService } from '../players/players.service';
import type { FollowRow } from './following.types';

function currentSeasonYear(): string {
  return String(new Date().getFullYear());
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

  constructor(
    private readonly games: GamesService,
    private readonly standings: StandingsService,
    private readonly players: PlayersService,
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

      return abbrs.map((abbr) => {
        const game = todaysGames.find(
          (g) => g.homeAbbr === abbr || g.awayAbbr === abbr,
        );
        const standing = standings.find((s) => s.abbr === abbr);
        const name = standing?.displayName ?? abbr;

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
            const line = `${verb} ${opponent} ${self ?? 0}–${opp ?? 0}`;
            return {
              kind: 'team' as const,
              id: abbr,
              name,
              teamAbbr: abbr,
              state: game.status,
              line,
              meta:
                game.status === 'live'
                  ? game.currentInning != null
                    ? `Inning ${game.currentInning} · live`
                    : 'Live'
                  : 'Final',
              gameId: game.providerGameId ?? null,
              mlbId: null,
            };
          }

          return {
            kind: 'team' as const,
            id: abbr,
            name,
            teamAbbr: abbr,
            state: 'scheduled' as const,
            line: `vs ${opponent} tonight`,
            meta:
              game.startTimeUtc != null
                ? new Date(game.startTimeUtc).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'Tonight',
            gameId: game.providerGameId ?? null,
            mlbId: null,
          };
        }

        // No game today — season state (record/standing), never blank.
        const line =
          standing != null
            ? `${standing.wins}–${standing.losses}, ${standing.streak}`
            : 'No game today';
        const meta =
          standing != null
            ? `${standing.rank}${standing.rank === 1 ? 'st' : 'th'} in ${standing.divisionName}`
            : '';
        return {
          kind: 'team' as const,
          id: abbr,
          name,
          teamAbbr: abbr,
          state: 'idle' as const,
          line,
          meta,
          gameId: null,
          mlbId: null,
        };
      });
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
        line: 'No data available',
        meta: '',
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
      line: result.line,
      meta: result.meta,
      gameId: result.gameId,
      mlbId,
    };
  }
}
