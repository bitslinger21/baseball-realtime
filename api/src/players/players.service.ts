import { Injectable } from '@nestjs/common';
import {
  BatterOverviewDto,
  BatterOverviewHeadlineDto,
  BatterOverviewSecondaryDto,
  BatterOverviewTodayDto,
} from './dtos/batter-overview.dto';

type StatsApiResponse = {
  stats?: Array<{
    group?: {
      displayName?: string;
      name?: string;
    };
    splits?: Array<{
      season?: string;
      stat?: Record<string, unknown>;
    }>;
  }>;
};

type SeasonBattingStats = {
  avg: string | null;
  obp: string | null;
  slg: string | null;
  ops: string | null;
  homeRuns: number | null;
  rbi: number | null;
};

type SeasonPitchingStats = {
  inningsPitched: string | null;
  era: string | null;
  whip: string | null;
  strikeOuts: number | null;
  wins: number | null;
  losses: number | null;
};

type MlbBattingStatLine = {
  gamesPlayed?: number | string;
  atBats?: number | string;
  runs?: number | string;
  hits?: number | string;
  doubles?: number | string;
  triples?: number | string;
  homeRuns?: number | string;
  rbi?: number | string;
  baseOnBalls?: number | string;
  strikeOuts?: number | string;
  stolenBases?: number | string;
  avg?: string;
  obp?: string;
  slg?: string;
  ops?: string;
};

function parseTeamIdFromLink(link: unknown): number | null {
  if (typeof link !== 'string' || link.trim() === '') return null;

  const match = link.match(/\/teams\/(\d+)$/);
  if (!match) return null;

  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

function currentSeasonYear(): string {
  return String(new Date().getFullYear());
}

function asStringOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

function asNumberOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;

  if (typeof v === 'string' && v.trim() !== '') {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function pickGroupStat(
  payload: StatsApiResponse,
  groupName: 'hitting' | 'pitching',
): Record<string, unknown> | null {
  const groups = Array.isArray(payload.stats) ? payload.stats : [];

  const group = groups.find((g) => {
    const displayName =
      typeof g.group?.displayName === 'string' ? g.group.displayName.toLowerCase() : null;
    const name = typeof g.group?.name === 'string' ? g.group.name.toLowerCase() : null;

    return displayName === groupName || name === groupName;
  });

  const split = Array.isArray(group?.splits) && group.splits.length > 0 ? group.splits[0] : null;
  const stat = split?.stat;

  return stat != null && typeof stat === 'object' ? stat : null;
}

function mapBattingStats(payload: StatsApiResponse): SeasonBattingStats | null {
  const stat = pickGroupStat(payload, 'hitting');
  if (stat == null) return null;

  return {
    avg: asStringOrNull(stat.avg),
    obp: asStringOrNull(stat.obp),
    slg: asStringOrNull(stat.slg),
    ops: asStringOrNull(stat.ops),
    homeRuns: asNumberOrNull(stat.homeRuns),
    rbi: asNumberOrNull(stat.rbi),
  };
}

function mapPitchingStats(payload: StatsApiResponse): SeasonPitchingStats | null {
  const stat = pickGroupStat(payload, 'pitching');
  if (stat == null) return null;

  return {
    inningsPitched: asStringOrNull(stat.inningsPitched),
    era: asStringOrNull(stat.era),
    whip: asStringOrNull(stat.whip),
    strikeOuts: asNumberOrNull(stat.strikeOuts),
    wins: asNumberOrNull(stat.wins),
    losses: asNumberOrNull(stat.losses),
  };
}

type StatsCacheEntry = {
  data: { season: string; batting: SeasonBattingStats | null; pitching: SeasonPitchingStats | null } | null;
  expiresAt: number;
};

@Injectable()
export class PlayersService {
  private readonly bioCache = new Map<string, { data: Record<string, unknown>; expiresAt: number }>();
  private readonly statsCache = new Map<string, StatsCacheEntry>();
  private readonly overviewCache = new Map<string, { data: BatterOverviewDto; expiresAt: number }>();

  private readonly TTL_BIO_MS = 24 * 60 * 60 * 1_000;
  private readonly TTL_STATS_MS = 5 * 60 * 1_000;

  private async fetchSeasonStats(
    mlbId: number,
    season: string,
  ): Promise<{
    season: string;
    batting: SeasonBattingStats | null;
    pitching: SeasonPitchingStats | null;
  } | null> {
    const cacheKey = `${mlbId}:${season}`;
    const cached = this.statsCache.get(cacheKey);
    if (cached != null && Date.now() < cached.expiresAt) return cached.data;

    const statsUrl = new URL(`https://statsapi.mlb.com/api/v1/people/${mlbId}/stats`);
    statsUrl.searchParams.set('stats', 'season');
    statsUrl.searchParams.set('group', 'hitting,pitching');
    statsUrl.searchParams.set('sportId', '1');
    statsUrl.searchParams.set('season', season);

    const statsRes = await fetch(statsUrl.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!statsRes.ok) {
      this.statsCache.set(cacheKey, { data: null, expiresAt: Date.now() + this.TTL_STATS_MS });
      return null;
    }

    const statsPayload = (await statsRes.json()) as StatsApiResponse;
    const result = {
      season,
      batting: mapBattingStats(statsPayload),
      pitching: mapPitchingStats(statsPayload),
    };
    this.statsCache.set(cacheKey, { data: result, expiresAt: Date.now() + this.TTL_STATS_MS });
    return result;
  }

  async getPlayer(mlbId: number, season?: string): Promise<Record<string, unknown>> {
    const resolvedSeason =
      season != null && season.trim() !== '' ? season.trim() : currentSeasonYear();

    const bioCacheKey = `bio:${mlbId}`;
    const cachedBio = this.bioCache.get(bioCacheKey);
    let data: Record<string, unknown>;

    if (cachedBio != null && Date.now() < cachedBio.expiresAt) {
      data = cachedBio.data;
    } else {
      const personUrl = new URL(`https://statsapi.mlb.com/api/v1/people/${mlbId}`);
      personUrl.searchParams.set('hydrate', 'currentTeam,team');

      const personRes = await fetch(personUrl.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!personRes.ok) {
        return {
          ok: false,
          status: personRes.status,
          mlbId,
          season: resolvedSeason,
        };
      }

      data = (await personRes.json()) as Record<string, unknown>;
      this.bioCache.set(bioCacheKey, { data, expiresAt: Date.now() + this.TTL_BIO_MS });
    }

    let seasonStats = await this.fetchSeasonStats(mlbId, resolvedSeason);

    const noStats =
      seasonStats == null ||
      (seasonStats.batting == null && seasonStats.pitching == null);

    if (noStats && resolvedSeason === currentSeasonYear()) {
      const fallbackSeason = String(Number(resolvedSeason) - 1);
      const fallbackStats = await this.fetchSeasonStats(mlbId, fallbackSeason);

      if (
        fallbackStats != null &&
        (fallbackStats.batting != null || fallbackStats.pitching != null)
      ) {
        seasonStats = fallbackStats;
      }
    }

    return {
      ok: true,
      mlbId,
      season: resolvedSeason,
      seasonStats,
      data,
    };
  }

  async getPlayerTeam(mlbId: number): Promise<Record<string, unknown>> {
    const res = await fetch(
      `https://statsapi.mlb.com/api/v1/people/${mlbId}?hydrate=currentTeam,team`,
      { method: 'GET', headers: { Accept: 'application/json' } },
    );

    if (!res.ok) {
      return { ok: false, status: res.status, mlbId, teamId: null };
    }

    const payload = (await res.json()) as Record<string, unknown>;

    const people = payload.people;
    if (!Array.isArray(people) || people.length === 0) {
      return { ok: true, mlbId, teamId: null };
    }

    const p = people[0] as Record<string, unknown>;
    const currentTeam = (p.currentTeam as Record<string, unknown> | null) ?? null;

    const teamIdFromObj =
      typeof currentTeam?.id === 'number' ? (currentTeam.id as number) : null;

    const teamIdFromLink =
      teamIdFromObj ??
      parseTeamIdFromLink(typeof currentTeam?.link === 'string' ? currentTeam.link : null);

    return {
      ok: true,
      mlbId,
      teamId: teamIdFromLink,
      currentTeamLink: typeof currentTeam?.link === 'string' ? currentTeam.link : null,
    };
  }

  async getBatterOverview(mlbId: string): Promise<BatterOverviewDto> {
    const cachedOverview = this.overviewCache.get(mlbId);
    if (cachedOverview != null && Date.now() < cachedOverview.expiresAt) {
      return cachedOverview.data;
    }

    const season = currentSeasonYear();

    const url = new URL(`https://statsapi.mlb.com/api/v1/people/${mlbId}/stats`);
    url.searchParams.set('stats', 'season');
    url.searchParams.set('group', 'hitting');
    url.searchParams.set('sportId', '1');
    url.searchParams.set('season', season);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Failed to load batter overview for player ${mlbId}.`);
    }

    const data = (await res.json()) as unknown;
    const stat = this.extractSeasonHittingStatLine(data) ?? {};

    const headline: BatterOverviewHeadlineDto = {
      battingAverage: this.asStatString(stat.avg, '.000'),
      onBasePercentage: this.asStatString(stat.obp, '.000'),
      sluggingPercentage: this.asStatString(stat.slg, '.000'),
      onBasePlusSlugging: this.asStatString(stat.ops, '.000'),
      homeRuns: this.asInt(stat.homeRuns),
      runsBattedIn: this.asInt(stat.rbi),
    };

    const secondary: BatterOverviewSecondaryDto = {
      games: this.asInt(stat.gamesPlayed),
      atBats: this.asInt(stat.atBats),
      runs: this.asInt(stat.runs),
      hits: this.asInt(stat.hits),
      doubles: this.asInt(stat.doubles),
      triples: this.asInt(stat.triples),
      walks: this.asInt(stat.baseOnBalls),
      strikeouts: this.asInt(stat.strikeOuts),
      stolenBases: this.asInt(stat.stolenBases),
    };

    const today: BatterOverviewTodayDto = {
      label: 'Today',
      statLine: 'No current game data.',
      isLive: false,
    };

    const overview: BatterOverviewDto = {
      playerId: mlbId,
      season: Number(season),
      headline,
      secondary,
      today,
    };
    this.overviewCache.set(mlbId, { data: overview, expiresAt: Date.now() + this.TTL_STATS_MS });
    return overview;
  }

  private extractSeasonHittingStatLine(
    response: unknown,
  ): MlbBattingStatLine | null {
    const root = response as {
      stats?: Array<{
        splits?: Array<{
          stat?: MlbBattingStatLine;
        }>;
      }>;
    };

    const stat = root.stats?.[0]?.splits?.[0]?.stat;
    return stat ?? null;
  }

  private asInt(value: string | number | undefined): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.trunc(value);
    }

    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return 0;
  }

  private asStatString(value: string | number | undefined, fallback: string): string {
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value.toFixed(3).replace(/^0/, '');
    }

    return fallback;
  }
}
