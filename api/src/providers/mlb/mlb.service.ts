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
  private readonly venueCache = new Map<
    number,
    { city: string | null; state: string | null }
  >();
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

    return await Promise.all(
      games.map(async (g0: unknown) => {
        const g = g0 as Record<string, unknown>;

        const gamePk: string = String(g.gamePk ?? '');
        const statusRaw: string = String((g.status as any)?.abstractGameState ?? '').toLowerCase();
        const status: 'scheduled' | 'live' | 'final' =
          statusRaw === 'preview' ? 'scheduled' : statusRaw === 'live' ? 'live' : 'final';

        const detailedState: string | null =
          typeof (g.status as any)?.detailedState === 'string'
            ? (g.status as any).detailedState
            : null;

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

        const outs: number | null =
          typeof linescore?.outs === 'number' ? linescore.outs : null;

        const providerVenueId: number | null =
          typeof (g as any)?.venue?.id === 'number' ? (g as any).venue.id : null;

        const venueName: string | null =
          typeof (g as any)?.venue?.name === 'string' ? (g as any).venue.name : null;

        const scheduleCity: string | null =
          typeof (g as any)?.venue?.location?.city === 'string'
            ? (g as any).venue.location.city
            : null;

        const scheduleState: string | null =
          typeof (g as any)?.venue?.location?.stateAbbrev === 'string'
            ? (g as any).venue.location.stateAbbrev
            : typeof (g as any)?.venue?.location?.state === 'string'
              ? (g as any).venue.location.state
              : null;

        const venueLocation =
          providerVenueId != null
            ? await this.getVenueLocation(providerVenueId)
            : { city: null, state: null };

        const city: string | null = scheduleCity ?? venueLocation.city;
        const state: string | null = scheduleState ?? venueLocation.state;

        return plainToInstance(GameDto, {
          providerGameId: gamePk,
          gameDate: date,

          homeAbbr: abbr(homeTeam),
          awayAbbr: abbr(awayTeam),
          homeName: homeTeam?.name ?? 'Unknown',
          awayName: awayTeam?.name ?? 'Unknown',

          status,
          detailedState,

          startTimeUtc: (g.gameDate as any) ?? null,
          snapshot: {
            venue: venueName,
            city,
            state,
            providerVenueId,
          },
          homeScore,
          awayScore,
          inning,
          half,
          outs,
        });
      }),
    );
  }

  private async getVenueLocation(
    venueId: number,
  ): Promise<{ city: string | null; state: string | null }> {
    const cached = this.venueCache.get(venueId);
    if (cached != null) {
      return cached;
    }

    const url = `${BASE}/v1/venues/${encodeURIComponent(String(venueId))}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      this.log.warn(
        `MLB venue lookup failed for ${venueId}: ${res.status} ${res.statusText}`,
      );
      const fallback = { city: null, state: null };
      this.venueCache.set(venueId, fallback);
      return fallback;
    }

    const data = (await res.json()) as {
      copyright: string;
      venues?: Array<{
        active: boolean;
        id: number;
        name: string;
        link: string;
        season: string
        location?: {
          city?: string;
          state?: string;
          stateAbbrev?: string;
        };
      }>;
    };

    const venue = Array.isArray(data.venues) ? data.venues[0] : null;
    const location = venue?.location;

    const resolved = {
      city: typeof location?.city === 'string' ? location.city : null,
      state:
        typeof location?.stateAbbrev === 'string'
          ? location.stateAbbrev
          : typeof location?.state === 'string'
            ? location.state
            : null,
    };

    this.venueCache.set(venueId, resolved);
    return resolved;
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
