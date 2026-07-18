import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { GameDto, ProbablePitcherDto, StarterStatusDto } from '../../games/dtos/game.dto';
import { MlbLiveFeed } from './mlb.types';

interface RecentStarter {
  date: string;
  mlbId: number;
  name: string;
  pitchHand: 'L' | 'R' | null;
  jerseyNumber: string | null;
}
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
    const games = this.extractGames(data);
    return await Promise.all(games.map((g) => this.mapRawGame(g, date)));
  }

  /**
   * Next N scheduled regular-season games for a team (for the Upcoming tab).
   * When no probable is posted for a game, projects the likely starter from
   * the opponent's recent rotation order.
   */
  async getUpcomingForTeam(teamId: number, count: number): Promise<GameDto[]> {
    const today = new Date().toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + 45 * 24 * 60 * 60 * 1_000).toISOString().slice(0, 10);
    const url =
      `${this.base}/v1/schedule?sportId=1` +
      `&teamId=${teamId}` +
      `&startDate=${today}&endDate=${endDate}` +
      `&gameType=R` +
      `&hydrate=team,linescore,probablesPitcher`;

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      this.log.warn(`MLB upcoming schedule failed for team ${teamId}: ${res.status}`);
      return [];
    }

    const data: unknown = await res.json();
    const allGames = this.extractGames(data);

    const scheduled = allGames.filter((g) => {
      const state = String(((g as any).status as any)?.abstractGameState ?? '').toLowerCase();
      return state === 'preview';
    });

    const sliced = scheduled.slice(0, Math.max(1, Math.min(count, 10)));

    // Map games and collect opponent team IDs that need projection
    const mappedGames = await Promise.all(
      sliced.map(async (g) => {
        const officialDate: string =
          typeof (g as any).officialDate === 'string'
            ? (g as any).officialDate
            : typeof (g as any).gameDate === 'string'
              ? (g as any).gameDate.slice(0, 10)
              : today;
        return { raw: g, dto: await this.mapRawGame(g, officialDate), officialDate };
      }),
    );

    // For games missing a probable on either side, fetch recent starters for opponent.
    // Batch distinct opponent team IDs so we fetch each team's history only once.
    const oppTeamIds = new Set<number>();
    for (const { raw, dto } of mappedGames) {
      const homeTeamId = (raw as any).teams?.home?.team?.id as number | undefined;
      const awayTeamId = (raw as any).teams?.away?.team?.id as number | undefined;
      if (!dto.homeProbable && homeTeamId) oppTeamIds.add(homeTeamId);
      if (!dto.awayProbable && awayTeamId) oppTeamIds.add(awayTeamId);
    }

    const recentStartersMap = new Map<number, RecentStarter[]>();
    await Promise.all(
      Array.from(oppTeamIds).map(async (tid) => {
        const starters = await this.getRecentStartersForTeam(tid).catch(() => []);
        recentStartersMap.set(tid, starters);
      }),
    );

    // Fetch the full upcoming schedule for each opponent that needs projection
    // to count intervening games between today and each target date.
    const oppScheduleMap = new Map<number, string[]>();
    await Promise.all(
      Array.from(oppTeamIds).map(async (tid) => {
        const dates = await this.getUpcomingDatesForTeam(tid, today, endDate).catch(() => []);
        oppScheduleMap.set(tid, dates);
      }),
    );

    // Attach starter status to each game DTO
    for (const { raw, dto, officialDate } of mappedGames) {
      const homeTeamId = (raw as any).teams?.home?.team?.id as number | undefined;
      const awayTeamId = (raw as any).teams?.away?.team?.id as number | undefined;

      if (!dto.homeProbable && homeTeamId) {
        const { prob, status } = this.resolveProjection(
          homeTeamId, officialDate, today, recentStartersMap, oppScheduleMap,
        );
        dto.homeProbable = prob;
        dto.homeStarterStatus = status;
      } else if (dto.homeProbable) {
        dto.homeStarterStatus = { status: 'confirmed' };
      }

      if (!dto.awayProbable && awayTeamId) {
        const { prob, status } = this.resolveProjection(
          awayTeamId, officialDate, today, recentStartersMap, oppScheduleMap,
        );
        dto.awayProbable = prob;
        dto.awayStarterStatus = status;
      } else if (dto.awayProbable) {
        dto.awayStarterStatus = { status: 'confirmed' };
      }
    }

    return mappedGames.map(({ dto }) => dto);
  }

  /** Fetch the last 14 days of completed regular-season games and extract starters.
   *  Uses the boxscore endpoint because probablesPitcher hydration returns null
   *  for completed (final) games. pitchers[0] in the boxscore is the actual starter.
   */
  private async getRecentStartersForTeam(teamId: number): Promise<RecentStarter[]> {
    const today = new Date().toISOString().slice(0, 10);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1_000).toISOString().slice(0, 10);
    const scheduleUrl =
      `${this.base}/v1/schedule?sportId=1` +
      `&teamId=${teamId}` +
      `&startDate=${twoWeeksAgo}&endDate=${today}` +
      `&gameType=R`;

    const schedRes = await fetch(scheduleUrl, { cache: 'no-store' });
    if (!schedRes.ok) return [];

    const schedData: unknown = await schedRes.json();
    const allGames = this.extractGames(schedData);

    // Collect final games with their PKs and official dates
    const finalGames: Array<{ gamePk: number; date: string; homeTeamId: number | null }> = [];
    for (const g of allGames) {
      const state = String(((g as any).status as any)?.abstractGameState ?? '').toLowerCase();
      if (state !== 'final') continue;
      const gamePk = typeof (g as any).gamePk === 'number' ? (g as any).gamePk as number : null;
      if (!gamePk) continue;
      const date: string =
        typeof (g as any).officialDate === 'string'
          ? (g as any).officialDate
          : typeof (g as any).gameDate === 'string'
            ? (g as any).gameDate.slice(0, 10)
            : '';
      if (!date) continue;
      const homeTeamId = (g as any).teams?.home?.team?.id as number | null ?? null;
      finalGames.push({ gamePk, date, homeTeamId });
    }

    // Fetch boxscores in parallel; extract the first pitcher (the starter)
    const starters: RecentStarter[] = [];
    await Promise.all(
      finalGames.map(async ({ gamePk, date, homeTeamId }) => {
        try {
          const boxRes = await fetch(`${this.base}/v1/game/${gamePk}/boxscore`, { cache: 'no-store' });
          if (!boxRes.ok) return;
          const box: any = await boxRes.json();
          const side = homeTeamId === teamId ? 'home' : 'away';
          const pitchers: number[] = box?.teams?.[side]?.pitchers ?? [];
          if (pitchers.length === 0) return;
          const starterPlayerId = pitchers[0]!;
          const player = box?.teams?.[side]?.players?.['ID' + starterPlayerId];
          const person = player?.person ?? {};
          const mlbId: number | null = typeof person.id === 'number' ? person.id : null;
          const name: string = typeof person.fullName === 'string' ? person.fullName : '';
          if (mlbId == null || !name) return;
          starters.push({ date, mlbId, name, pitchHand: null, jerseyNumber: null });
        } catch {
          // skip individual game failures
        }
      }),
    );

    return starters.sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Fetch scheduled game dates for a team between two dates (for counting turns). */
  private async getUpcomingDatesForTeam(teamId: number, from: string, to: string): Promise<string[]> {
    const url =
      `${this.base}/v1/schedule?sportId=1` +
      `&teamId=${teamId}` +
      `&startDate=${from}&endDate=${to}` +
      `&gameType=R`;

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];

    const data: unknown = await res.json();
    const games = this.extractGames(data);
    const dates: string[] = [];
    for (const g of games) {
      const state = String(((g as any).status as any)?.abstractGameState ?? '').toLowerCase();
      if (state !== 'preview') continue;
      const d =
        typeof (g as any).officialDate === 'string'
          ? (g as any).officialDate
          : typeof (g as any).gameDate === 'string'
            ? (g as any).gameDate.slice(0, 10)
            : null;
      if (d) dates.push(d);
    }
    return dates.sort();
  }

  /** Compute rotation projection for a single game. */
  private resolveProjection(
    oppTeamId: number,
    targetDate: string,
    today: string,
    recentStartersMap: Map<number, RecentStarter[]>,
    oppScheduleMap: Map<number, string[]>,
  ): { prob: ProbablePitcherDto | null; status: StarterStatusDto } {
    const recentStarters = recentStartersMap.get(oppTeamId) ?? [];
    if (recentStarters.length < 2) return { prob: null, status: { status: 'tbd' } };

    // Build rotation: ordered list of distinct pitchers in first-appearance order
    const seen = new Set<number>();
    const rotation: RecentStarter[] = [];
    for (const s of recentStarters) {
      if (!seen.has(s.mlbId)) { seen.add(s.mlbId); rotation.push(s); }
    }
    if (rotation.length < 2) return { prob: null, status: { status: 'tbd' } };

    // Most recent starter
    const lastStarter = recentStarters[recentStarters.length - 1]!;
    const lastIdx = rotation.findIndex(r => r.mlbId === lastStarter.mlbId);

    // Count opponent games strictly before the target date (not including target)
    const oppDates = oppScheduleMap.get(oppTeamId) ?? [];
    const gamesBeforeTarget = oppDates.filter(d => d < targetDate).length;

    // The projected starter is (lastIdx + 1 + gamesBeforeTarget) % rotation.length
    const projIdx = (lastIdx + 1 + gamesBeforeTarget) % rotation.length;
    const projected = rotation[projIdx]!;

    // Determine confidence: how far out + any off-days between today and target
    const turnsOut = 1 + gamesBeforeTarget;
    const daysBetween = Math.max(0, (new Date(targetDate).getTime() - new Date(today).getTime()) / 86_400_000);
    const hasOffDay = oppDates.length > 0 && daysBetween > oppDates.filter(d => d < targetDate).length + 1;

    let confidence: 'High' | 'Medium' | 'Low';
    if (turnsOut === 1 && !hasOffDay) confidence = 'High';
    else if (turnsOut <= 2 || hasOffDay) confidence = 'Medium';
    else confidence = 'Low';

    // Readable last-start date for projected pitcher
    const lastStartEntry = [...recentStarters].reverse().find(r => r.mlbId === projected.mlbId);
    const lastStart = lastStartEntry
      ? new Date(`${lastStartEntry.date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
      : '—';

    // Basis sentence
    const prevStarter = rotation[(projIdx - 1 + rotation.length) % rotation.length]!;
    const restDays = lastStartEntry
      ? Math.round((new Date(targetDate).getTime() - new Date(lastStartEntry.date).getTime()) / 86_400_000)
      : null;
    let basis: string;
    if (hasOffDay) {
      basis = `On turn behind ${prevStarter.name}, but an off-day in the window could let them skip or realign.`;
    } else if (restDays != null) {
      basis = `On turn behind ${prevStarter.name}, on normal ${restDays} days' rest.`;
    } else {
      basis = `Next in rotation order behind ${prevStarter.name}.`;
    }

    const prob: ProbablePitcherDto = {
      mlbId: projected.mlbId,
      name: projected.name,
      jerseyNumber: projected.jerseyNumber,
      pitchHand: projected.pitchHand,
    };

    return { prob, status: { status: 'projected', confidence, lastStart, basis } };
  }

  private extractGames(data: unknown): unknown[] {
    const anyData = data as Record<string, unknown>;
    const dates: unknown[] = Array.isArray(anyData?.dates) ? (anyData.dates as unknown[]) : [];
    return dates.flatMap((d: unknown) => {
      const anyD = d as Record<string, unknown>;
      const gs: unknown = anyD?.games;
      return Array.isArray(gs) ? gs : [];
    });
  }

  private toProb(p: any): ProbablePitcherDto | null {
    if (p == null) return null;
    return {
      mlbId: typeof p.id === 'number' ? p.id : null,
      name: typeof p.fullName === 'string' ? p.fullName : null,
      jerseyNumber: typeof p.primaryNumber === 'string' ? p.primaryNumber : null,
      pitchHand: (p.pitchHand?.code === 'L' || p.pitchHand?.code === 'R') ? p.pitchHand.code : null,
    };
  }

  private async mapRawGame(g0: unknown, date: string): Promise<GameDto> {
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

    const homeProbable = this.toProb((g.teams as any)?.home?.probablePitcher ?? null);
    const awayProbable = this.toProb((g.teams as any)?.away?.probablePitcher ?? null);

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
      // Typed fields — available to all consumers without snapshot parsing
      venue: venueName,
      homeTeamId,
      awayTeamId,
      homeProbable,
      awayProbable,
      // Keep in snapshot for DB-backed readers (getSeries, fromEntity fallback)
      snapshot: {
        venue: venueName,
        city,
        state,
        providerVenueId,
        homeTeamId,
        awayTeamId,
        homeProbable,
        awayProbable,
      },
      homeScore,
      awayScore,
      inning,
      half,
      outs,
    });
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
    const url = `${this.base}/v1/standings?leagueId=103,104&season=${encodeURIComponent(season)}&standingsTypes=regularSeason&hydrate=team`;
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

  /**
   * Per-at-bat win probability and leverage index for a game.
   */
  async getWinProbability(gamePk: string): Promise<Array<{ atBatIndex: number; homeTeamWinProbability: number; leverageIndex?: number }>> {
    const url = `${this.base}/v1/game/${encodeURIComponent(gamePk)}/winProbability`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      this.log.warn(`MLB winProbability failed for ${gamePk}: ${res.status}`);
      return [];
    }
    const data = (await res.json()) as unknown[];
    if (!Array.isArray(data)) return [];
    return data.flatMap((entry: unknown) => {
      const e = entry as Record<string, unknown>;
      const about = e?.about as Record<string, unknown> | undefined;
      const atBatIndex = about?.atBatIndex;
      const homeTeamWinProbability = e?.homeTeamWinProbability;
      if (typeof atBatIndex !== 'number' || typeof homeTeamWinProbability !== 'number') return [];
      const leverageIndex = typeof e?.leverageIndex === 'number' ? e.leverageIndex : undefined;
      return [{ atBatIndex, homeTeamWinProbability, leverageIndex }];
    });
  }
}
