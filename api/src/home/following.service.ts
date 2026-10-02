import { Injectable, Logger } from '@nestjs/common';
import { StandingsService } from '../standings/standings.service';
import { PlayersService } from '../players/players.service';
import { MlbApiService } from '../providers/mlb/mlb.service';
import type { GameDto } from '../games/dtos/game.dto';
import type { StandingTeamDto } from '../standings/dtos/standing-team.dto';
import type { FollowFace, FollowRow, FollowState } from './following.types';
import {
  gameView,
  nextGameFace,
  noGameToday,
  playerSeason,
  playerToday,
  safeTimeZone,
  teamSeason,
  teamToday,
  type FollowFeed,
} from './follow-faces';

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

const noData = (label: FollowFace['label']): FollowFace => ({ label, lines: ['No data available', ''] });

@Injectable()
export class FollowingService {
  private readonly log = new Logger(FollowingService.name);
  private teamIdCache: { data: Map<string, number>; expiresAt: number } | null =
    null;
  private readonly TTL_TEAM_ID_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly standings: StandingsService,
    private readonly players: PlayersService,
    private readonly mlb: MlbApiService,
  ) {}

  async getFollowing(
    teamAbbrs: readonly string[],
    playerIds: readonly number[],
    timeZone?: string,
  ): Promise<FollowRow[]> {
    const tz = safeTimeZone(timeZone);
    const [schedule, standings] = await Promise.all([
      this.mlb.getScheduleByDate(todayYmdEastern()).catch(() => [] as GameDto[]),
      teamAbbrs.length > 0
        ? this.standings.getStandings(currentSeasonYear()).catch(() => [] as StandingTeamDto[])
        : Promise.resolve([] as StandingTeamDto[]),
    ]);
    const [teamRows, playerRows] = await Promise.all([
      Promise.all(teamAbbrs.map((abbr) => this.followTeam(abbr, schedule, standings, tz))),
      Promise.all(playerIds.map((id) => this.followPlayer(id, schedule, tz))),
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

  // The club's next game AFTER today's (or the next one at all on an off day).
  private async nextGame(teamId: number, todayGameId: string | null): Promise<GameDto | null> {
    const upcoming = await this.mlb.getUpcomingForTeam(teamId, 3).catch(() => [] as GameDto[]);
    return upcoming.find((g) => g.providerGameId !== todayGameId && g.status !== 'final') ?? null;
  }

  // TODAY (+ NEXT GAME after a game today) for one club. The SEASON layer is
  // the caller's — it differs for teams and players.
  private async todayFaces(
    teamId: number,
    schedule: readonly GameDto[],
    tz: string,
    today: (feed: FollowFeed) => FollowFace | null,
  ): Promise<{ today: FollowFace; next: FollowFace | null; state: FollowState; gameId: string | null }> {
    const game = schedule.find((g) => g.homeTeamId === teamId || g.awayTeamId === teamId);
    if (game?.providerGameId == null) {
      return { today: noGameToday(await this.nextGame(teamId, null), teamId, tz), next: null, state: 'idle', gameId: null };
    }
    const feed = (await this.mlb.getLiveFeedCached(game.providerGameId)) as FollowFeed;
    const gv = gameView(feed, teamId, tz);
    const face = today(feed);
    if (gv == null || face == null) {
      return { today: noGameToday(await this.nextGame(teamId, null), teamId, tz), next: null, state: 'idle', gameId: null };
    }
    const next = gv.state === 'scheduled' ? null : await this.nextGame(teamId, game.providerGameId);
    return {
      today: face,
      next: next != null ? nextGameFace(next, teamId, tz) : null,
      state: gv.state,
      gameId: game.providerGameId,
    };
  }

  private async followTeam(
    abbr: string,
    schedule: readonly GameDto[],
    standings: readonly StandingTeamDto[],
    tz: string,
  ): Promise<FollowRow> {
    const standing = standings.find((s) => s.abbr === abbr);
    const base = { kind: 'team' as const, id: abbr, name: standing?.displayName ?? abbr, teamAbbr: abbr, mlbId: null };
    try {
      const teamId = await this.getTeamId(abbr);
      if (teamId == null) return { ...base, state: 'idle', faces: [noData('TODAY')], gameId: null };
      const t = await this.todayFaces(teamId, schedule, tz, (feed) => {
        const gv = gameView(feed, teamId, tz);
        return gv != null ? teamToday(gv) : null;
      });
      const faces = [t.today, standing != null ? teamSeason(standing) : noData('SEASON')];
      if (t.next != null) faces.push(t.next);
      return { ...base, state: t.state, faces, gameId: t.gameId };
    } catch (e: unknown) {
      this.log.warn(`followTeam ${abbr} failed: ${e instanceof Error ? e.message : String(e)}`);
      return { ...base, state: 'idle', faces: [noData('TODAY')], gameId: null };
    }
  }

  private async followPlayer(mlbId: number, schedule: readonly GameDto[], tz: string): Promise<FollowRow> {
    const who = await this.players.getFollowIdentity(mlbId);
    const base = { kind: 'player' as const, id: String(mlbId), name: who.name, teamAbbr: who.teamAbbr, mlbId };
    try {
      const totals = await this.players.getSeasonTotals(mlbId).catch(() => null);
      const season = playerSeason(totals);
      if (who.teamId == null) {
        return { ...base, state: 'idle', faces: [{ label: 'TODAY', lines: ['No current team', ''] }, season], gameId: null };
      }
      const teamId = who.teamId;
      const t = await this.todayFaces(teamId, schedule, tz, (feed) => {
        const gv = gameView(feed, teamId, tz);
        return gv != null ? playerToday(gv, mlbId) : null;
      });
      const faces = [t.today, season];
      if (t.next != null) faces.push(t.next);
      return { ...base, state: t.state, faces, gameId: t.gameId };
    } catch (e: unknown) {
      this.log.warn(`followPlayer ${mlbId} failed: ${e instanceof Error ? e.message : String(e)}`);
      return { ...base, state: 'idle', faces: [noData('TODAY')], gameId: null };
    }
  }
}
