import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { GameDto } from 'src/games/dtos/game.dto';
import { MlbLiveFeed } from './mlb.types';

// Node 18+ has global fetch; if you’re on older Node, install 'undici' or 'node-fetch'
const BASE = 'https://statsapi.mlb.com/api';

@Injectable()
export class MlbApiService {
  private readonly log = new Logger(MlbApiService.name);

  /**
   * Return normalized games for a yyyy-mm-dd date.
   */
  async getScheduleByDate(date: string): Promise<GameDto[]> {
    const url = `${BASE}/v1/schedule?sportId=1&hydrate=team,linescore&date=${encodeURIComponent(date)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new InternalServerErrorException(
        `MLB schedule failed: ${res.status} ${res.statusText}`,
      );
    }

    const data: unknown = await res.json();
    const anyData = data as Record<string, unknown>;
    const dates: unknown[] = Array.isArray(anyData?.dates) ? (anyData.dates as unknown[]) : [];
    const games: unknown[] = dates.flatMap((d: unknown) => {
      const anyD = d as Record<string, unknown>;
      const gs: unknown = anyD?.games;
      return Array.isArray(gs) ? gs : [];
    });

    return games.map((g0: unknown) => {
      const g = g0 as Record<string, unknown>;

      const gamePk: string = String(g.gamePk ?? '');
      const statusRaw: string = String((g.status as any)?.abstractGameState ?? '').toLowerCase(); // preview|live|final
      const status: 'scheduled' | 'live' | 'final' =
        statusRaw === 'preview' ? 'scheduled' : statusRaw === 'live' ? 'live' : 'final';

      const detailedState: string | null =
        typeof (g.status as any)?.detailedState === 'string' ? (g.status as any).detailedState : null;

      const homeTeam: any = (g.teams as any)?.home?.team ?? {};
      const awayTeam: any = (g.teams as any)?.away?.team ?? {};

      const abbr = (t: any): string =>
        t?.abbreviation ??
        t?.fileCode?.toUpperCase?.() ??
        t?.teamCode ??
        t?.teamName ??
        t?.name ??
        'UNK';

      const linescore: any = (g as any).linescore ?? null;

      const awayScore: number | null =
        typeof (g.teams as any)?.away?.score === 'number'
          ? (g.teams as any).away.score
          : typeof linescore?.teams?.away?.runs === 'number'
            ? linescore.teams.away.runs
            : null;

      const homeScore: number | null =
        typeof (g.teams as any)?.home?.score === 'number'
          ? (g.teams as any).home.score
          : typeof linescore?.teams?.home?.runs === 'number'
            ? linescore.teams.home.runs
            : null;

      const inning: number | null =
        typeof linescore?.currentInning === 'number' ? linescore.currentInning : null;

      const halfRaw: string =
        String(linescore?.inningHalf ?? linescore?.currentInningHalf ?? '').toLowerCase();
      const half: 'top' | 'bottom' | null =
        halfRaw === 'top' ? 'top' : halfRaw === 'bottom' ? 'bottom' : null;

      const outs: number | null = typeof linescore?.outs === 'number' ? linescore.outs : null;

      return plainToInstance(GameDto, {
        providerGameId: gamePk,
        gameDate: date,

        homeAbbr: abbr(homeTeam),
        awayAbbr: abbr(awayTeam),
        homeName: homeTeam?.name ?? 'Unknown',
        awayName: awayTeam?.name ?? 'Unknown',

        status, // scheduled | live | final
        detailedState,

        startTimeUtc: (g.gameDate as any) ?? null,
        snapshot: undefined,

        homeScore,
        awayScore,
        inning,
        half,
        outs,
      });
    });
  }

  /**
   * Live feed for a gamePk (string).
   */
  async getLiveFeed(gamePk: string): Promise<MlbLiveFeed> {
    const url = `${BASE}/v1.1/game/${encodeURIComponent(gamePk)}/feed/live`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      throw new InternalServerErrorException(
        `MLB live feed failed: ${res.status} ${res.statusText}`,
      );
    }

    const json = (await res.json()) as MlbLiveFeed;
    return json;
  }
}
