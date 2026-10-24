import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import {
  GameDto,
  ProbablePitcherDto,
  StarterStatusDto,
} from '../../games/dtos/game.dto';
import { SeasonGameDto } from '../../games/dtos/season-game.dto';
import { MlbLiveFeed } from './mlb.types';

interface RecentStarter {
  date: string;
  mlbId: number;
  name: string;
  pitchHand: 'L' | 'R' | null;
  jerseyNumber: string | null;
}
import type { AppConfig } from '../../domains/config/env';

export type MlbPerson = {
  name: string;
  bats: string | null;
  throws: string | null;
  jerseyNumber: string | null;
  position: string | null;
};

type RawBroadcast = { name?: string; type?: string; language?: string; isNational?: boolean; homeAway?: string };

// The TV networks to show for a game (PROMPT_games_broadcasts.md `pickTV`):
// English TV only (radio and Spanish-language feeds dropped), not MLB.TV
// (it carries nearly every game), nationals first then away then home, each
// network once (the feed lists a national network for both sides), by name.
export function pickTvBroadcasts(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const rank = (b: RawBroadcast): number => (b.isNational ? 0 : b.homeAway === 'away' ? 1 : 2);
  const seen = new Set<string>();
  return (list as RawBroadcast[])
    .filter((b) => b?.type === 'TV' && (b.language ?? 'en') === 'en' && b.name != null && !/^MLB\.?TV$/i.test(b.name))
    .sort((a, b) => rank(a) - rank(b))
    .filter((b) => !seen.has(b.name!) && seen.add(b.name!) != null)
    .map((b) => b.name!);
}

@Injectable()
export class MlbApiService {
  private readonly log = new Logger(MlbApiService.name);
  private readonly base: string;
  private readonly liveFeedCache = new Map<string, { data: MlbLiveFeed; expiresAt: number }>();
  private readonly venueCache = new Map<
    number,
    { city: string | null; state: string | null }
  >();

  // Callers asking for the same thing at the same moment share one request,
  // and the answer is kept for ttlMs. MLB throttles a server that asks too
  // often (406s from production, Oct 16, 2026) — one Home load used to fire
  // the same 30-team standings build five times over. A failure isn't kept.
  private readonly shared = new Map<string, { value: Promise<unknown>; expiresAt: number }>();

  private share<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const hit = this.shared.get(key);
    if (hit != null && Date.now() < hit.expiresAt) return hit.value as Promise<T>;
    const value = load();
    // Held until it settles; a success is then kept for ttlMs.
    this.shared.set(key, { value, expiresAt: Infinity });
    value.then(
      () => this.shared.set(key, { value, expiresAt: Date.now() + ttlMs }),
      () => this.shared.delete(key),
    );
    return value;
  }

  constructor(cfg: ConfigService) {
    this.base =
      cfg.get<AppConfig['mlbApiBase']>('app.mlbApiBase') ??
      'https://statsapi.mlb.com/api';
  }
  /**
   * Return normalized games for a yyyy-mm-dd date. Kept 2.5s — enough to
   * merge the callers that land on the same tick, under the 3s live cadence.
   */
  getScheduleByDate(date: string): Promise<GameDto[]> {
    return this.share(`schedule:${date}`, 2_500, () => this.fetchScheduleByDate(date));
  }

  private async fetchScheduleByDate(date: string): Promise<GameDto[]> {
    const url = `${this.base}/v1/schedule?sportId=1&hydrate=team,linescore,probablePitcher&date=${encodeURIComponent(date)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new InternalServerErrorException(
        `MLB schedule failed: ${res.status} ${res.statusText} URL=${url}`,
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
    const endDate = new Date(Date.now() + 45 * 24 * 60 * 60 * 1_000)
      .toISOString()
      .slice(0, 10);
    const url =
      `${this.base}/v1/schedule?sportId=1` +
      `&teamId=${teamId}` +
      `&startDate=${today}&endDate=${endDate}` +
      // Regular season plus every postseason round (Wild Card, Division,
      // League Championship, World Series) — regular-season-only went empty
      // the day the season ended, so "next game" and the Upcoming tab fell
      // back to "No game scheduled" / mock games all October.
      `&gameType=R,F,D,L,W` +
      `&hydrate=team,linescore,probablePitcher`;

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      this.log.warn(
        `MLB upcoming schedule failed for team ${teamId}: ${res.status}`,
      );
      return [];
    }

    const data: unknown = await res.json();
    const allGames = this.extractGames(data);

    const scheduled = allGames.filter((g) => {
      const state = String(
        (g as any).status?.abstractGameState ?? '',
      ).toLowerCase();
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
        return {
          raw: g,
          dto: await this.mapRawGame(g, officialDate),
          officialDate,
        };
      }),
    );

    // For games missing a probable on either side, fetch recent starters for opponent.
    // Batch distinct opponent team IDs so we fetch each team's history only once.
    const oppTeamIds = new Set<number>();
    for (const { raw, dto } of mappedGames) {
      const homeTeamId = (raw as any).teams?.home?.team?.id as
        | number
        | undefined;
      const awayTeamId = (raw as any).teams?.away?.team?.id as
        | number
        | undefined;
      if (!dto.homeProbable && homeTeamId) oppTeamIds.add(homeTeamId);
      if (!dto.awayProbable && awayTeamId) oppTeamIds.add(awayTeamId);
    }

    const recentStartersMap = new Map<number, RecentStarter[]>();
    await Promise.all(
      Array.from(oppTeamIds).map(async (tid) => {
        const starters = await this.getRecentStartersForTeam(tid).catch(
          () => [],
        );
        recentStartersMap.set(tid, starters);
      }),
    );

    // Fetch the full upcoming schedule for each opponent that needs projection
    // to count intervening games between today and each target date.
    const oppScheduleMap = new Map<number, string[]>();
    await Promise.all(
      Array.from(oppTeamIds).map(async (tid) => {
        const dates = await this.getUpcomingDatesForTeam(
          tid,
          today,
          endDate,
        ).catch(() => []);
        oppScheduleMap.set(tid, dates);
      }),
    );

    // Starters already confirmed for upcoming games in this window are starts
    // the projection must account for — otherwise every later game projects
    // the same "next" pitcher (Oct 2: Rasmussen confirmed Oct 3, then also
    // projected Oct 5 and Oct 7).
    const confirmedAhead = new Map<number, RecentStarter[]>();
    for (const { raw, dto, officialDate } of mappedGames) {
      for (const [side, prob] of [['home', dto.homeProbable], ['away', dto.awayProbable]] as const) {
        const tid = (raw as any).teams?.[side]?.team?.id as number | undefined;
        if (tid == null || prob?.mlbId == null || prob.name == null) continue;
        const list = confirmedAhead.get(tid) ?? [];
        list.push({ date: officialDate, mlbId: prob.mlbId, name: prob.name, pitchHand: null, jerseyNumber: prob.jerseyNumber ?? null });
        confirmedAhead.set(tid, list);
      }
    }

    // Attach starter status to each game DTO
    for (const { raw, dto, officialDate } of mappedGames) {
      const homeTeamId = (raw as any).teams?.home?.team?.id as
        | number
        | undefined;
      const awayTeamId = (raw as any).teams?.away?.team?.id as
        | number
        | undefined;

      if (!dto.homeProbable && homeTeamId) {
        const { prob, status } = this.resolveProjection(
          homeTeamId,
          officialDate,
          today,
          recentStartersMap,
          oppScheduleMap,
          confirmedAhead,
        );
        dto.homeProbable = prob;
        dto.homeStarterStatus = status;
      } else if (dto.homeProbable) {
        dto.homeStarterStatus = { status: 'confirmed' };
      }

      if (!dto.awayProbable && awayTeamId) {
        const { prob, status } = this.resolveProjection(
          awayTeamId,
          officialDate,
          today,
          recentStartersMap,
          oppScheduleMap,
          confirmedAhead,
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
   *  Uses the boxscore endpoint because probablePitcher hydration returns null
   *  for completed (final) games. pitchers[0] in the boxscore is the actual starter.
   */
  private async getRecentStartersForTeam(
    teamId: number,
  ): Promise<RecentStarter[]> {
    const today = new Date().toISOString().slice(0, 10);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1_000)
      .toISOString()
      .slice(0, 10);
    const scheduleUrl =
      `${this.base}/v1/schedule?sportId=1` +
      `&teamId=${teamId}` +
      `&startDate=${twoWeeksAgo}&endDate=${today}` +
      // Postseason starts count toward the rotation too.
      `&gameType=R,F,D,L,W`;

    const schedRes = await fetch(scheduleUrl, { cache: 'no-store' });
    if (!schedRes.ok) return [];

    const schedData: unknown = await schedRes.json();
    const allGames = this.extractGames(schedData);

    // Collect final games with their PKs and official dates
    const finalGames: Array<{
      gamePk: number;
      date: string;
      homeTeamId: number | null;
    }> = [];
    for (const g of allGames) {
      const state = String(
        (g as any).status?.abstractGameState ?? '',
      ).toLowerCase();
      if (state !== 'final') continue;
      const gamePk =
        typeof (g as any).gamePk === 'number'
          ? ((g as any).gamePk as number)
          : null;
      if (!gamePk) continue;
      const date: string =
        typeof (g as any).officialDate === 'string'
          ? (g as any).officialDate
          : typeof (g as any).gameDate === 'string'
            ? (g as any).gameDate.slice(0, 10)
            : '';
      if (!date) continue;
      const homeTeamId =
        ((g as any).teams?.home?.team?.id as number | null) ?? null;
      finalGames.push({ gamePk, date, homeTeamId });
    }

    // Fetch boxscores in parallel; extract the first pitcher (the starter)
    const starters: RecentStarter[] = [];
    await Promise.all(
      finalGames.map(async ({ gamePk, date, homeTeamId }) => {
        try {
          const boxRes = await fetch(
            `${this.base}/v1/game/${gamePk}/boxscore`,
            { cache: 'no-store' },
          );
          if (!boxRes.ok) return;
          const box: any = await boxRes.json();
          const side = homeTeamId === teamId ? 'home' : 'away';
          const pitchers: number[] = box?.teams?.[side]?.pitchers ?? [];
          if (pitchers.length === 0) return;
          const starterPlayerId = pitchers[0];
          const player = box?.teams?.[side]?.players?.['ID' + starterPlayerId];
          // An opener or bullpen game isn't a turn in the rotation: count a
          // start only when its pitcher went at least 3 innings.
          const ip = String(player?.stats?.pitching?.inningsPitched ?? '0').split('.');
          const outs = (Number(ip[0]) || 0) * 3 + (Number(ip[1]) || 0);
          if (outs < 9) return;
          const person = player?.person ?? {};
          const mlbId: number | null =
            typeof person.id === 'number' ? person.id : null;
          const name: string =
            typeof person.fullName === 'string' ? person.fullName : '';
          if (mlbId == null || !name) return;
          starters.push({
            date,
            mlbId,
            name,
            pitchHand: null,
            jerseyNumber: null,
          });
        } catch {
          // skip individual game failures
        }
      }),
    );

    return starters.sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Fetch scheduled game dates for a team between two dates (for counting turns). */
  private async getUpcomingDatesForTeam(
    teamId: number,
    from: string,
    to: string,
  ): Promise<string[]> {
    const url =
      `${this.base}/v1/schedule?sportId=1` +
      `&teamId=${teamId}` +
      `&startDate=${from}&endDate=${to}` +
      `&gameType=R,F,D,L,W`;

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];

    const data: unknown = await res.json();
    const games = this.extractGames(data);
    const dates: string[] = [];
    for (const g of games) {
      const state = String(
        (g as any).status?.abstractGameState ?? '',
      ).toLowerCase();
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
    confirmedAhead: Map<number, RecentStarter[]> = new Map(),
  ): { prob: ProbablePitcherDto | null; status: StarterStatusDto } {
    // Past starts, plus starters already confirmed for games before the target.
    const recentStarters = [
      ...(recentStartersMap.get(oppTeamId) ?? []),
      ...(confirmedAhead.get(oppTeamId) ?? []).filter((s) => s.date < targetDate),
    ].sort((a, b) => a.date.localeCompare(b.date));
    if (recentStarters.length < 2)
      return { prob: null, status: { status: 'tbd' } };

    // Build rotation: ordered list of distinct pitchers in first-appearance order
    const seen = new Set<number>();
    const rotation: RecentStarter[] = [];
    for (const s of recentStarters) {
      if (!seen.has(s.mlbId)) {
        seen.add(s.mlbId);
        rotation.push(s);
      }
    }
    if (rotation.length < 2) return { prob: null, status: { status: 'tbd' } };

    // Most recent starter
    const lastStarter = recentStarters[recentStarters.length - 1];
    const lastIdx = rotation.findIndex((r) => r.mlbId === lastStarter.mlbId);

    // Opponent games between the last known start and the target (exclusive).
    const oppDates = oppScheduleMap.get(oppTeamId) ?? [];
    const gamesBeforeTarget = oppDates.filter((d) => d > lastStarter.date && d < targetDate).length;

    // The projected starter is (lastIdx + 1 + gamesBeforeTarget) % rotation.length,
    // skipping anyone who'd be on fewer than MIN_REST_DAYS' rest (a starter is
    // never projected to go again a day or two after his last start).
    const MIN_REST_DAYS = 4;
    const lastStartOf = (mlbId: number): string | undefined =>
      [...recentStarters].reverse().find((r) => r.mlbId === mlbId)?.date;
    const restBefore = (mlbId: number): number => {
      const d = lastStartOf(mlbId);
      return d == null ? Infinity : (new Date(targetDate).getTime() - new Date(d).getTime()) / 86_400_000;
    };
    let projIdx = (lastIdx + 1 + gamesBeforeTarget) % rotation.length;
    let skipped = 0;
    while (restBefore(rotation[projIdx].mlbId) < MIN_REST_DAYS && skipped < rotation.length) {
      projIdx = (projIdx + 1) % rotation.length;
      skipped++;
    }
    if (skipped >= rotation.length) return { prob: null, status: { status: 'tbd' } };
    const projected = rotation[projIdx];

    // Determine confidence: how far out + any off-days between today and target
    const turnsOut = 1 + gamesBeforeTarget;
    const daysBetween = Math.max(
      0,
      (new Date(targetDate).getTime() - new Date(today).getTime()) / 86_400_000,
    );
    const hasOffDay =
      oppDates.length > 0 &&
      daysBetween > oppDates.filter((d) => d < targetDate).length + 1;

    let confidence: 'High' | 'Medium' | 'Low';
    if (skipped > 0) confidence = 'Low'; // the rotation order had to bend for rest
    else if (turnsOut === 1 && !hasOffDay) confidence = 'High';
    else if (turnsOut <= 2 || hasOffDay) confidence = 'Medium';
    else confidence = 'Low';

    // Readable last-start date for projected pitcher
    const lastStartEntry = [...recentStarters]
      .reverse()
      .find((r) => r.mlbId === projected.mlbId);
    const lastStart = lastStartEntry
      ? new Date(`${lastStartEntry.date}T12:00:00Z`).toLocaleDateString(
        'en-US',
        { month: 'short', day: 'numeric', timeZone: 'UTC' },
      )
      : '—';

    // Basis sentence
    const prevStarter =
      rotation[(projIdx - 1 + rotation.length) % rotation.length];
    const restDays = lastStartEntry
      ? Math.round(
        (new Date(targetDate).getTime() -
          new Date(lastStartEntry.date).getTime()) /
        86_400_000,
      )
      : null;
    let basis: string;
    if (hasOffDay) {
      basis = `On turn behind ${prevStarter.name}, but an off-day in the window could let them skip or realign.`;
    } else if (restDays != null && restDays <= 6) {
      basis = `On turn behind ${prevStarter.name}, on normal ${restDays} days' rest.`;
    } else if (restDays != null) {
      basis = `On turn behind ${prevStarter.name}, ${restDays} days since his last start.`;
    } else {
      basis = `Next in rotation order behind ${prevStarter.name}.`;
    }

    const prob: ProbablePitcherDto = {
      mlbId: projected.mlbId,
      name: projected.name,
      jerseyNumber: projected.jerseyNumber,
      pitchHand: projected.pitchHand,
    };

    return {
      prob,
      status: { status: 'projected', confidence, lastStart, basis },
    };
  }

  private extractGames(data: unknown): unknown[] {
    const anyData = data as Record<string, unknown>;
    const dates: unknown[] = Array.isArray(anyData?.dates)
      ? (anyData.dates as unknown[])
      : [];
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
      jerseyNumber:
        typeof p.primaryNumber === 'string' ? p.primaryNumber : null,
      pitchHand:
        p.pitchHand?.code === 'L' || p.pitchHand?.code === 'R'
          ? p.pitchHand.code
          : null,
    };
  }

  private async mapRawGame(g0: unknown, date: string): Promise<GameDto> {
    const g = g0 as Record<string, unknown>;

    const gamePk: string = String(g.gamePk ?? '');
    const statusRaw: string = String(
      (g.status as any)?.abstractGameState ?? '',
    ).toLowerCase();
    const status: 'scheduled' | 'live' | 'final' =
      statusRaw === 'preview'
        ? 'scheduled'
        : statusRaw === 'live'
          ? 'live'
          : 'final';

    const detailedState: string | null =
      typeof (g.status as any)?.detailedState === 'string'
        ? (g.status as any).detailedState
        : null;

    const homeTeam: any = (g.teams as any)?.home?.team ?? {};
    const awayTeam: any = (g.teams as any)?.away?.team ?? {};
    const homeTeamId: number | null =
      typeof homeTeam?.id === 'number' ? homeTeam.id : null;
    const awayTeamId: number | null =
      typeof awayTeam?.id === 'number' ? awayTeam.id : null;

    const homeProbable = this.toProb(
      (g.teams as any)?.home?.probablePitcher ?? null,
    );
    const awayProbable = this.toProb(
      (g.teams as any)?.away?.probablePitcher ?? null,
    );

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

    const lsInnings: any[] = Array.isArray(linescore?.innings)
      ? linescore.innings
      : [];
    const inning: number | null =
      typeof linescore?.currentInning === 'number'
        ? linescore.currentInning
        : lsInnings.length > 0
          ? lsInnings.length
          : null;

    const halfRaw: string = String(
      linescore?.inningHalf ?? linescore?.currentInningHalf ?? '',
    ).toLowerCase();
    const half: 'top' | 'bottom' | null =
      halfRaw === 'top' ? 'top' : halfRaw === 'bottom' ? 'bottom' : null;

    const outs: number | null =
      typeof linescore?.outs === 'number' ? linescore.outs : null;

    const providerVenueId: number | null =
      typeof (g as any)?.venue?.id === 'number' ? (g as any).venue.id : null;

    const venueName: string | null =
      typeof (g as any)?.venue?.name === 'string'
        ? (g as any).venue.name
        : null;

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
    const tvBroadcasts = pickTvBroadcasts((g as any)?.broadcasts);
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
      // MLB lists a not-yet-set time (later postseason rounds, rain-outs) as a
      // stand-in clock time with status.startTimeTBD — "6:33" read as real.
      startTimeUtc: (g as any)?.status?.startTimeTBD === true ? null : ((g.gameDate as any) ?? null),
      // Typed fields — available to all consumers without snapshot parsing
      venue: venueName,
      homeTeamId,
      awayTeamId,
      homeProbable,
      awayProbable,
      tvBroadcasts,
      // Keep in snapshot for DB-backed readers (getSeries, fromEntity fallback)
      snapshot: {
        tvBroadcasts,
        venue: venueName,
        city,
        state,
        providerVenueId,
        homeTeamId,
        awayTeamId,
        homeProbable,
        awayProbable,
        currentInning: inning,
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
        season: string;
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
  ): Promise<
    Array<{
      date: string;
      awayAbbr: string;
      awayScore: number | null;
      homeAbbr: string;
      homeScore: number | null;
      winner: string | null;
    }>
  > {
    const url = `${this.base}/v1/schedule?sportId=1&gameType=R&teamId=${homeTeamId}&opponentId=${awayTeamId}&season=${encodeURIComponent(season)}&hydrate=linescore`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      this.log.warn(
        `MLB series failed for ${homeTeamId} vs ${awayTeamId}: ${res.status}`,
      );
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
        const state = String(
          (g as any).status?.abstractGameState ?? '',
        ).toLowerCase();
        return state === 'final';
      })
      .map((g: unknown) => {
        const anyG = g as any;
        const awayT = anyG.teams?.away;
        const homeT = anyG.teams?.home;
        const awayAbbr: string =
          awayT?.team?.abbreviation ?? awayT?.team?.teamCode ?? '?';
        const homeAbbr: string =
          homeT?.team?.abbreviation ?? homeT?.team?.teamCode ?? '?';
        if (awayAbbr === '?' || homeAbbr === '?') {
          this.log.warn(
            `[MlbApiService] missing team abbreviation in final-games sweep (home=${homeAbbr}, away=${awayAbbr})`,
          );
        }
        const awayScore: number | null =
          typeof awayT?.score === 'number' ? awayT.score : null;
        const homeScore: number | null =
          typeof homeT?.score === 'number' ? homeT.score : null;
        const winner: string | null =
          awayScore != null && homeScore != null
            ? awayScore > homeScore
              ? awayAbbr
              : homeScore > awayScore
                ? homeAbbr
                : null
            : null;
        const officialDate: string | null =
          typeof anyG.officialDate === 'string' ? anyG.officialDate : null;
        const date =
          officialDate != null
            ? new Date(`${officialDate}T12:00:00`).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
            : '?';
        return { date, awayAbbr, awayScore, homeAbbr, homeScore, winner };
      });
  }

  /**
   * Standings for all divisions for a given season year. Kept 60s.
   */
  getStandings(season: string): Promise<unknown[]> {
    return this.share(`standings:${season}`, 60_000, () => this.fetchStandings(season));
  }

  private async fetchStandings(season: string): Promise<unknown[]> {
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
   * The live feed with a short shared cache — for read-mostly callers that may
   * ask for the same game many times a minute (Home Following builds a layer
   * per followed player/team, refreshed every 30s). The poller keeps using the
   * uncached getLiveFeed.
   */
  async getLiveFeedCached(gamePk: string, ttlMs = 20_000): Promise<MlbLiveFeed> {
    const hit = this.liveFeedCache.get(gamePk);
    if (hit != null && Date.now() < hit.expiresAt) return hit.data;
    const data = await this.getLiveFeed(gamePk);
    this.liveFeedCache.set(gamePk, { data, expiresAt: Date.now() + ttlMs });
    return data;
  }

  /**
   * Career totals before this season (career − season, regular season) for
   * the alert milestones (PROMPT_alerts.md). The difference is the same
   * whenever it's fetched, so callers add the live box-score season line to
   * get career-now. Players missing from the answer are simply left out.
   */
  async getCareerBases(
    ids: readonly number[],
    season: string,
  ): Promise<Map<number, { hr: number; hits: number; k: number; w: number }>> {
    const out = new Map<number, { hr: number; hits: number; k: number; w: number }>();
    if (ids.length === 0) return out;
    const url =
      `${this.base}/v1/people?personIds=${ids.join(',')}` +
      `&hydrate=stats(group=[hitting,pitching],type=[career,season],season=${encodeURIComponent(season)},gameType=R)`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new InternalServerErrorException(`MLB people stats failed: ${res.status}`);
    type Stat = { homeRuns?: number; hits?: number; strikeOuts?: number; wins?: number };
    const json = (await res.json()) as {
      people?: { id: number; stats?: { type?: { displayName?: string }; group?: { displayName?: string }; splits?: { stat?: Stat }[] }[] }[];
    };
    for (const p of json.people ?? []) {
      const get = (type: string, group: string): Stat =>
        p.stats?.find((s) => s.type?.displayName === type && s.group?.displayName === group)?.splits?.[0]?.stat ?? {};
      const ch = get('career', 'hitting'), sh = get('season', 'hitting');
      const cp = get('career', 'pitching'), spit = get('season', 'pitching');
      out.set(p.id, {
        hr: (ch.homeRuns ?? 0) - (sh.homeRuns ?? 0),
        hits: (ch.hits ?? 0) - (sh.hits ?? 0),
        k: (cp.strikeOuts ?? 0) - (spit.strikeOuts ?? 0),
        w: (cp.wins ?? 0) - (spit.wins ?? 0),
      });
    }
    return out;
  }

  /**
   * Editorial content for a gamePk — recaps, condensed game, and per-play
   * video highlights (PROMPT_video_clips.md). Returns null on failure rather
   * than throwing: the clips ingest job tolerates a missed poll and retries
   * on its next cycle, same posture as the rest of the ingest.
   */
  async getGameContent(gamePk: string): Promise<unknown | null> {
    const url = `${this.base}/v1/game/${encodeURIComponent(gamePk)}/content`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch (e: unknown) {
      this.log.warn(
        `MLB game content failed for ${gamePk}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  }

  /**
   * The season's postseason bracket as MLB publishes it: every series
   * (F_1..F_4 Wild Card, D_1..D_4 Division, L_1/L_2 LCS, W_1 World Series)
   * with its games. Exists before the first pitch — series whose teams aren't
   * known yet carry placeholder "teams" (e.g. abbreviation "NYY/BOS").
   * Returns the raw `series` array (PROMPT_postseason_bracket.md §5). Kept 30s.
   */
  getPostseasonSeries(season: string): Promise<unknown[]> {
    return this.share(`postseason:${season}`, 30_000, () => this.fetchPostseasonSeries(season));
  }

  private async fetchPostseasonSeries(season: string): Promise<unknown[]> {
    const url =
      `${this.base}/v1/schedule/postseason/series?sportId=1&season=${encodeURIComponent(season)}` +
      '&hydrate=team,linescore,decisions,probablePitcher';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new InternalServerErrorException(
        `MLB postseason series failed: ${res.status} ${res.statusText}`,
      );
    }
    const data = (await res.json()) as Record<string, unknown>;
    return Array.isArray(data.series) ? (data.series as unknown[]) : [];
  }

  /**
   * A team's finished games over the last `days`, most recent first —
   * regular season and postseason (no gameType filter). Kept 30 min.
   */
  getRecentFinalsForTeam(
    teamId: number,
    days = 45,
  ): Promise<{ gamePk: string; date: string; side: 'away' | 'home' }[]> {
    return this.share(
      `recentFinals:${teamId}:${days}`,
      30 * 60_000,
      async () => {
        const end = new Date().toISOString().slice(0, 10);
        const start = new Date(Date.now() - days * 24 * 3600_000)
          .toISOString()
          .slice(0, 10);
        const url = `${this.base}/v1/schedule?sportId=1&teamId=${teamId}&startDate=${start}&endDate=${end}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`MLB team schedule failed: ${res.status}`);
        type ScheduleGame = {
          gamePk?: number;
          officialDate?: string;
          gameDate?: string;
          status?: { abstractGameState?: string };
          teams?: { home?: { team?: { id?: number } } };
        };
        const out: { gamePk: string; date: string; side: 'away' | 'home' }[] =
          [];
        for (const g of this.extractGames(await res.json()) as ScheduleGame[]) {
          if ((g.status?.abstractGameState ?? '').toLowerCase() !== 'final')
            continue;
          if (g.gamePk == null) continue;
          const date = g.officialDate ?? (g.gameDate ?? '').slice(0, 10);
          out.push({
            gamePk: String(g.gamePk),
            date,
            side: g.teams?.home?.team?.id === teamId ? 'home' : 'away',
          });
        }
        return out.sort(
          (a, b) =>
            b.date.localeCompare(a.date) || b.gamePk.localeCompare(a.gamePk),
        );
      },
    );
  }

  // Hands, bats and numbers don't change within a season: kept for the process.
  private readonly peopleCache = new Map<number, MlbPerson>();

  /** People by id in one request (cached), for hands, bats and numbers. */
  async getPeople(ids: readonly number[]): Promise<Map<number, MlbPerson>> {
    const missing = [...new Set(ids)].filter((id) => !this.peopleCache.has(id));
    if (missing.length > 0) {
      const url = `${this.base}/v1/people?personIds=${missing.join(',')}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as {
          people?: {
            id?: number;
            fullName?: string;
            batSide?: { code?: string };
            pitchHand?: { code?: string };
            primaryNumber?: string;
            primaryPosition?: { abbreviation?: string };
          }[];
        };
        for (const p of data.people ?? []) {
          if (p.id == null) continue;
          this.peopleCache.set(p.id, {
            name: p.fullName ?? String(p.id),
            bats: p.batSide?.code ?? null,
            throws: p.pitchHand?.code ?? null,
            jerseyNumber: p.primaryNumber ?? null,
            position: p.primaryPosition?.abbreviation ?? null,
          });
        }
      }
    }
    const out = new Map<number, MlbPerson>();
    for (const id of ids) {
      const p = this.peopleCache.get(id);
      if (p != null) out.set(id, p);
    }
    return out;
  }

  // A finished game's box score never changes: kept for the process (bounded).
  private readonly finalBoxCache = new Map<string, unknown>();

  /** Box score of a FINISHED game, cached for good. */
  async getFinalBoxScore(gamePk: string): Promise<unknown> {
    const hit = this.finalBoxCache.get(gamePk);
    if (hit !== undefined) return hit;
    const box = await this.getRawBoxScore(gamePk);
    if (box != null) {
      const oldest = this.finalBoxCache.keys().next();
      if (this.finalBoxCache.size >= 500 && oldest.done !== true)
        this.finalBoxCache.delete(oldest.value);
      this.finalBoxCache.set(gamePk, box);
    }
    return box;
  }

  /** Hits / at-bats over a batter's last `n` games. Kept 1h. */
  getLastGamesHitting(
    mlbId: number,
    n = 7,
  ): Promise<{ h: number; ab: number } | null> {
    return this.share(`lastGames:${mlbId}:${n}`, 3600_000, async () => {
      const url = `${this.base}/v1/people/${mlbId}/stats?stats=lastXGames&group=hitting&limit=${n}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        stats?: { splits?: { stat?: { hits?: number; atBats?: number } }[] }[];
      };
      const stat = data.stats?.[0]?.splits?.[0]?.stat;
      return stat != null && typeof stat.atBats === 'number'
        ? { h: stat.hits ?? 0, ab: stat.atBats }
        : null;
    });
  }
  /**
   * Raw box score for a gamePk. Returns null on failure (callers treat a
   * missing box score as "no notable line", never an error).
   */
  async getRawBoxScore(gamePk: string): Promise<unknown | null> {
    const url = `${this.base}/v1/game/${encodeURIComponent(gamePk)}/boxscore`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch (e: unknown) {
      this.log.warn(
        `MLB box score failed for ${gamePk}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  }

  /**
   * Per-at-bat win probability and leverage index for a game.
   */
  // Kept 60s (a failure comes back as [] and is kept too, so a throttled
  // MLB isn't asked again for every one of the 30 teams on the next build).
  getSeasonScheduleForTeam(
    teamId: number,
    season: string,
  ): Promise<SeasonGameDto[]> {
    return this.share(`season:${teamId}:${season}`, 60_000, () =>
      this.fetchSeasonScheduleForTeam(teamId, season),
    );
  }

  private async fetchSeasonScheduleForTeam(
    teamId: number,
    season: string,
  ): Promise<SeasonGameDto[]> {
    const url =
      `${this.base}/v1/schedule?sportId=1&teamId=${teamId}` +
      `&season=${encodeURIComponent(season)}&gameType=R` +
      `&hydrate=team,linescore,decisions,probablePitcher`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      this.log.warn(
        `MLB season schedule failed for team ${teamId}: ${res.status}`,
      );
      return [];
    }
    const data: unknown = await res.json();
    const games = this.extractGames(data);
    return games.map((g) => this.mapSeasonGame(g, teamId));
  }

  private mapSeasonGame(g: unknown, teamId: number): SeasonGameDto {
    const raw = g as any;

    const gamePk =
      typeof raw.gamePk === 'number' ? String(raw.gamePk as number) : null;
    const gameDate =
      typeof raw.officialDate === 'string'
        ? (raw.officialDate as string)
        : typeof raw.gameDate === 'string'
          ? (raw.gameDate as string).slice(0, 10)
          : '';
    const startTimeUtc =
      typeof raw.gameDate === 'string' ? (raw.gameDate as string) : null;

    const homeTeamId =
      (raw.teams?.home?.team?.id as number | undefined) ?? null;
    const isHome = homeTeamId === teamId;

    const myTeam = isHome ? raw.teams?.home : raw.teams?.away;
    const oppTeam = isHome ? raw.teams?.away : raw.teams?.home;

    const oppAbbr =
      (oppTeam?.team?.abbreviation as string | undefined) ??
      (oppTeam?.team?.fileCode as string | undefined)?.toUpperCase() ??
      'UNK';
    const oppName =
      (oppTeam?.team?.teamName as string | undefined) ??
      (oppTeam?.team?.name as string | undefined) ??
      'Unknown';
    const oppTeamId =
      typeof oppTeam?.team?.id === 'number'
        ? (oppTeam.team.id as number)
        : null;

    const statusRaw = String(raw.status?.abstractGameState ?? '').toLowerCase();
    const status: 'scheduled' | 'live' | 'final' =
      statusRaw === 'preview'
        ? 'scheduled'
        : statusRaw === 'live'
          ? 'live'
          : 'final';

    const detailedState =
      typeof raw.status?.detailedState === 'string'
        ? (raw.status.detailedState as string)
        : null;

    const teamScore =
      typeof myTeam?.score === 'number' ? (myTeam.score as number) : null;
    const oppScore =
      typeof oppTeam?.score === 'number' ? (oppTeam.score as number) : null;

    const decisions = raw.decisions ?? null;
    const winnerName =
      typeof decisions?.winner?.fullName === 'string'
        ? (decisions.winner.fullName as string)
        : null;
    const loserName =
      typeof decisions?.loser?.fullName === 'string'
        ? (decisions.loser.fullName as string)
        : null;
    const winnerId =
      typeof decisions?.winner?.id === 'number'
        ? (decisions.winner.id as number)
        : null;
    const loserId =
      typeof decisions?.loser?.id === 'number'
        ? (decisions.loser.id as number)
        : null;

    const homeProbableName =
      typeof raw.teams?.home?.probablePitcher?.fullName === 'string'
        ? (raw.teams.home.probablePitcher.fullName as string)
        : null;
    const awayProbableName =
      typeof raw.teams?.away?.probablePitcher?.fullName === 'string'
        ? (raw.teams.away.probablePitcher.fullName as string)
        : null;

    const linescore = raw.linescore ?? null;
    const currentInning =
      typeof linescore?.currentInning === 'number'
        ? (linescore.currentInning as number)
        : null;
    const halfInning =
      typeof linescore?.inningHalf === 'string'
        ? (linescore.inningHalf as string)
        : null;

    const dto = new SeasonGameDto();
    dto.providerGameId = gamePk;
    dto.gameDate = gameDate;
    dto.startTimeUtc = startTimeUtc;
    dto.isHome = isHome;
    dto.oppAbbr = oppAbbr;
    dto.oppName = oppName;
    dto.oppTeamId = oppTeamId;
    dto.status = status;
    dto.detailedState = detailedState;
    dto.teamScore = teamScore;
    dto.oppScore = oppScore;
    dto.winnerName = winnerName;
    dto.loserName = loserName;
    dto.winnerId = winnerId;
    dto.loserId = loserId;
    dto.homeProbableName = homeProbableName;
    dto.awayProbableName = awayProbableName;
    dto.currentInning = currentInning;
    dto.halfInning = halfInning;
    return dto;
  }

  async getWinProbability(gamePk: string): Promise<
    Array<{
      atBatIndex: number;
      homeTeamWinProbability: number;
      leverageIndex?: number;
    }>
  > {
    const url = `${this.base}/v1/game/${encodeURIComponent(gamePk)}/winProbability`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      if (res.status !== 404) {
        this.log.warn(`MLB winProbability failed for ${gamePk}: ${res.status}`);
      }
      return [];
    }
    const data = (await res.json()) as unknown[];
    if (!Array.isArray(data)) return [];
    return data.flatMap((entry: unknown) => {
      const e = entry as Record<string, unknown>;
      const about = e?.about as Record<string, unknown> | undefined;
      const atBatIndex = about?.atBatIndex;
      const homeTeamWinProbability = e?.homeTeamWinProbability;
      if (
        typeof atBatIndex !== 'number' ||
        typeof homeTeamWinProbability !== 'number'
      )
        return [];
      const leverageIndex =
        typeof e?.leverageIndex === 'number' ? e.leverageIndex : undefined;
      return [{ atBatIndex, homeTeamWinProbability, leverageIndex }];
    });
  }

  /**
   * Situational splits (e.g. RISP, vs LHP) for a batter or pitcher, current season.
   * Raw rows — caller shapes into whatever UI/prompt format it needs.
   */
  async getSituationalSplits(
    playerId: number,
    season: number,
    group: 'hitting' | 'pitching',
    sitCodes: readonly string[],
  ): Promise<
    Array<{
      code: string;
      description: string;
      plateAppearances: number;
      avg: number | null;
      obp: number | null;
      slg: number | null;
    }>
  > {
    const url =
      `${this.base}/v1/people/${encodeURIComponent(String(playerId))}/stats` +
      `?stats=statSplits&group=${group}&season=${season}&sitCodes=${sitCodes.join(',')}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      this.log.warn(
        `MLB statSplits failed for player ${playerId}: ${res.status}`,
      );
      return [];
    }
    const data = (await res.json()) as {
      stats?: Array<{
        splits?: Array<{
          split?: { code?: string; description?: string };
          stat?: {
            avg?: string;
            obp?: string;
            slg?: string;
            plateAppearances?: string;
          };
        }>;
      }>;
    };
    const splits = data.stats?.[0]?.splits ?? [];
    const toNum = (v: string | undefined): number | null =>
      v == null || v === '.---' || v === '-.--' ? null : Number(v);
    return splits.flatMap((s) => {
      const code = s.split?.code;
      if (code == null) return [];
      return [
        {
          code,
          description: s.split?.description ?? code,
          plateAppearances: Number(s.stat?.plateAppearances ?? '0'),
          avg: toNum(s.stat?.avg),
          obp: toNum(s.stat?.obp),
          slg: toNum(s.stat?.slg),
        },
      ];
    });
  }

  private readonly venueFieldInfoCache = new Map<
    number,
    VenueFieldInfo | null
  >();

  /**
   * Outfield wall geometry for a venue. Cached forever in-process — this data
   * doesn't change mid-season.
   */
  async getVenueFieldInfo(venueId: number): Promise<VenueFieldInfo | null> {
    if (this.venueFieldInfoCache.has(venueId)) {
      return this.venueFieldInfoCache.get(venueId) ?? null;
    }
    const url = `${this.base}/v1/venues/${encodeURIComponent(String(venueId))}?hydrate=fieldInfo`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      this.log.warn(`MLB venue fieldInfo failed for ${venueId}: ${res.status}`);
      this.venueFieldInfoCache.set(venueId, null);
      return null;
    }
    const data = (await res.json()) as {
      venues?: Array<{
        fieldInfo?: {
          leftLine?: number;
          leftCenter?: number;
          center?: number;
          rightCenter?: number;
          rightLine?: number;
          wallLeft?: number;
          wallCenter?: number;
          wallRight?: number;
        };
        location?: { elevation?: number };
      }>;
    };
    const v = data.venues?.[0];
    if (v?.fieldInfo == null) {
      this.venueFieldInfoCache.set(venueId, null);
      return null;
    }
    const info: VenueFieldInfo = {
      leftLineFt: v.fieldInfo.leftLine ?? null,
      leftCenterFt: v.fieldInfo.leftCenter ?? null,
      centerFt: v.fieldInfo.center ?? null,
      rightCenterFt: v.fieldInfo.rightCenter ?? null,
      rightLineFt: v.fieldInfo.rightLine ?? null,
      elevationFt: v.location?.elevation ?? null,
    };
    this.venueFieldInfoCache.set(venueId, info);
    return info;
  }

  private teamVenueIdCache: Map<string, number> | null = null;

  /** teamAbbr -> venueId for all 30 teams, fetched once and cached forever. */
  async getAllTeamVenueIds(): Promise<Map<string, number>> {
    if (this.teamVenueIdCache != null) return this.teamVenueIdCache;
    const url = `${this.base}/v1/teams?sportId=1&hydrate=venue`;
    const res = await fetch(url, { cache: 'no-store' });
    const map = new Map<string, number>();
    if (res.ok) {
      const data = (await res.json()) as {
        teams?: Array<{ abbreviation?: string; venue?: { id?: number } }>;
      };
      for (const t of data.teams ?? []) {
        if (t.abbreviation != null && typeof t.venue?.id === 'number') {
          map.set(t.abbreviation, t.venue.id);
        }
      }
    } else {
      this.log.warn(`MLB teams/venue lookup failed: ${res.status}`);
    }
    this.teamVenueIdCache = map;
    return map;
  }

  private allTeamIdsCache: number[] | null = null;

  /** Numeric MLB team ids for all 30 clubs, fetched once and cached forever. */
  async getAllTeamIds(): Promise<number[]> {
    if (this.allTeamIdsCache != null) return this.allTeamIdsCache;
    const url = `${this.base}/v1/teams?sportId=1`;
    const res = await fetch(url, { cache: 'no-store' });
    const ids: number[] = [];
    if (res.ok) {
      const data = (await res.json()) as {
        teams?: Array<{ id?: number }>;
      };
      for (const t of data.teams ?? []) {
        if (typeof t.id === 'number') ids.push(t.id);
      }
    } else {
      this.log.warn(`MLB teams lookup failed: ${res.status}`);
    }
    this.allTeamIdsCache = ids;
    return ids;
  }
}

export type VenueFieldInfo = {
  leftLineFt: number | null;
  leftCenterFt: number | null;
  centerFt: number | null;
  rightCenterFt: number | null;
  rightLineFt: number | null;
  elevationFt: number | null;
};
