import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { GameDto } from '../../games/dtos/game.dto';
import { MlbLiveFeed } from './mlb.types';
import type { AppConfig } from '../../domains/config/env';

@Injectable()
export class MlbApiService {
  private readonly log = new Logger(MlbApiService.name);
  private readonly base: string;
  private readonly venueCache = new Map<
    number,
    { city: string | null; state: string | null }
  >();

  constructor(cfg: ConfigService) {
    this.base = cfg.get<AppConfig['mlbApiBase']>('app.mlbApiBase') ?? 'https://statsapi.mlb.com/api';
  }
  /**
   * Return normalized games for a yyyy-mm-dd date.
   */
  async getScheduleByDate(date: string): Promise<GameDto[]> {
    const url = `${this.base}/v1/schedule?sportId=1&hydrate=team,linescore,probablesPitcher&date=${encodeURIComponent(date)}`;
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
        const homeTeamId: number | null = typeof homeTeam?.id === 'number' ? homeTeam.id : null;
        const awayTeamId: number | null = typeof awayTeam?.id === 'number' ? awayTeam.id : null;

        const toProb = (p: any) => p == null ? null : {
          mlbId: typeof p.id === 'number' ? p.id : null,
          name: typeof p.fullName === 'string' ? p.fullName : null,
          jerseyNumber: typeof p.primaryNumber === 'string' ? p.primaryNumber : null,
          pitchHand: typeof p.pitchHand?.code === 'string' ? p.pitchHand.code : null,
        };
        const awayProbable = toProb((g.teams as any)?.away?.probablePitcher ?? null);
        const homeProbable = toProb((g.teams as any)?.home?.probablePitcher ?? null);

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
            homeTeamId,
            awayTeamId,
            awayProbable,
            homeProbable,
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

    const url = `${this.base}/v1/venues/${encodeURIComponent(String(venueId))}`;
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
   * All completed regular-season head-to-head games between two teams.
   */
  async getSeasonSeriesGames(
    homeTeamId: number,
    awayTeamId: number,
    season: string,
  ): Promise<Array<{
    date: string;
    awayAbbr: string;
    awayScore: number | null;
    homeAbbr: string;
    homeScore: number | null;
    winner: string | null;
  }>> {
    const url = `${this.base}/v1/schedule?sportId=1&gameType=R&teamId=${homeTeamId}&opponentId=${awayTeamId}&season=${encodeURIComponent(season)}&hydrate=linescore`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      this.log.warn(`MLB series failed for ${homeTeamId} vs ${awayTeamId}: ${res.status}`);
      return [];
    }

    const data = (await res.json()) as Record<string, unknown>;
    const dates = Array.isArray(data.dates) ? (data.dates as unknown[]) : [];
    const games = dates.flatMap((d: unknown) => {
      const anyD = d as Record<string, unknown>;
      return Array.isArray(anyD.games) ? (anyD.games as unknown[]) : [];
    });

    return games
      .filter((g: unknown) => {
        const state = String(((g as any).status as any)?.abstractGameState ?? '').toLowerCase();
        return state === 'final';
      })
      .map((g: unknown) => {
        const anyG = g as any;
        const awayT = anyG.teams?.away;
        const homeT = anyG.teams?.home;
        const awayAbbr: string = awayT?.team?.abbreviation ?? awayT?.team?.teamCode ?? 'AWY';
        const homeAbbr: string = homeT?.team?.abbreviation ?? homeT?.team?.teamCode ?? 'HOM';
        const awayScore: number | null = typeof awayT?.score === 'number' ? awayT.score : null;
        const homeScore: number | null = typeof homeT?.score === 'number' ? homeT.score : null;
        const winner: string | null =
          awayScore != null && homeScore != null
            ? awayScore > homeScore ? awayAbbr : homeScore > awayScore ? homeAbbr : null
            : null;
        const officialDate: string | null =
          typeof anyG.officialDate === 'string' ? anyG.officialDate : null;
        const date = officialDate != null
          ? new Date(`${officialDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : '?';
        return { date, awayAbbr, awayScore, homeAbbr, homeScore, winner };
      });
  }

  /**
   * Standings for all divisions for a given season year.
   */
  async getStandings(season: string): Promise<unknown[]> {
    const url = `${this.base}/v1/standings?leagueId=103,104&season=${encodeURIComponent(season)}&standingsTypes=regularSeason`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new InternalServerErrorException(
        `MLB standings failed: ${res.status} ${res.statusText}`,
      );
    }
    const data = (await res.json()) as Record<string, unknown>;
    return Array.isArray(data.records) ? (data.records as unknown[]) : [];
  }

  /**
   * Live feed for a gamePk (string).
   */
  async getLiveFeed(gamePk: string): Promise<MlbLiveFeed> {
    const url = `${this.base}/v1.1/game/${encodeURIComponent(gamePk)}/feed/live`;
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
