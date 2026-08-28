import { Injectable, Logger } from '@nestjs/common';
import {
  BatterOverviewDto,
  BatterOverviewHeadlineDto,
  BatterOverviewSecondaryDto,
  BatterOverviewTodayDto,
} from './dtos/batter-overview.dto';
import { PlayerSplitsDto, SplitRowDto } from './dtos/player-splits.dto';
import { PlayerPitchingDto, PitchArsenalRowDto, PitcherSplitRowDto, PitcherSeasonTotalsDto } from './dtos/player-pitching.dto';
import { PlayerDrilldownDto, GameLogRowDto, CareerRowDto, VsTeamRowDto } from './dtos/player-drilldown.dto';
import { VsPlayerDto } from './dtos/vs-player.dto';
import { MlbApiService } from '../providers/mlb/mlb.service';

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
  private readonly log = new Logger(PlayersService.name);

  private readonly bioCache = new Map<string, { data: Record<string, unknown>; expiresAt: number }>();
  private readonly statsCache = new Map<string, StatsCacheEntry>();
  private readonly overviewCache = new Map<string, { data: BatterOverviewDto; expiresAt: number }>();

  private readonly TTL_BIO_MS = 24 * 60 * 60 * 1_000;
  private readonly TTL_STATS_MS = 5 * 60 * 1_000;
  private readonly TTL_OVERVIEW_LIVE_MS = 30_000;

  public constructor(private readonly mlb: MlbApiService) {}

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

    const today = await this.fetchTodayBattingLine(mlbId);

    const overview: BatterOverviewDto = {
      playerId: mlbId,
      season: Number(season),
      headline,
      secondary,
      today,
    };
    const ttl = today.isLive ? this.TTL_OVERVIEW_LIVE_MS : this.TTL_STATS_MS;
    this.overviewCache.set(mlbId, { data: overview, expiresAt: Date.now() + ttl });
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
      // Normalize "0.239" → ".239" to match MLB format and ensure hero/Stats tab agree
      return value.trim().replace(/^0\./, '.');
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value.toFixed(3).replace(/^0/, '');
    }

    return fallback;
  }

  private makeEmptyToday(extra: Partial<BatterOverviewTodayDto> = {}): BatterOverviewTodayDto {
    return {
      label: 'Today',
      statLine: 'No current game data.',
      isLive: false,
      plateAppearances: null,
      atBats: null,
      hits: null,
      homeRuns: null,
      rbi: null,
      walks: null,
      strikeouts: null,
      avg: null,
      gameStatus: null,
      opponent: null,
      gameId: null,
      playerState: null,
      lastGame: null,
      ...extra,
    };
  }

  /** Fetch the most recent completed game log entry for this batter (for the off-day widget). */
  private async fetchLastPlayedGame(
    mlbId: string,
    season: number,
  ): Promise<{ date: string; opponent: string; hits: number; atBats: number } | null> {
    try {
      const url =
        `https://statsapi.mlb.com/api/v1/people/${mlbId}/stats` +
        `?stats=gameLog&group=hitting&season=${season}&gameType=R&limit=1`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, unknown>;
      const statsArr = Array.isArray(data.stats) ? (data.stats as Record<string, unknown>[]) : [];
      const splits = Array.isArray(statsArr[0]?.splits)
        ? (statsArr[0].splits as Record<string, unknown>[])
        : [];
      const last = splits[0] ?? null;
      if (last == null) return null;

      const stat = (last.stat ?? {}) as Record<string, unknown>;
      const gameDate = typeof last.date === 'string' ? last.date : null; // 'YYYY-MM-DD'
      const opponent = ((last.opponent ?? {}) as Record<string, unknown>).abbreviation;
      const hits = typeof stat.hits === 'number' ? stat.hits : 0;
      const atBats = typeof stat.atBats === 'number' ? stat.atBats : 0;

      if (gameDate == null || typeof opponent !== 'string') return null;

      // Format date as "Aug 26" (abbreviated month + day)
      const d = new Date(gameDate + 'T12:00:00'); // noon UTC avoids tz rollover
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { date: dateStr, opponent, hits, atBats };
    } catch {
      return null;
    }
  }

  async getPlayerSplits(mlbId: string, season: string, timeframe: 'season' | 'career' = 'season'): Promise<PlayerSplitsDto> {
    const SPLIT_LABELS: Record<string, string> = {
      vl: 'vs LHP', vr: 'vs RHP',
      h: 'Home', a: 'Away',
      d: 'Day', n: 'Night',
      r0: 'Bases Empty', ron: 'Runners On', risp: 'RISP',
      ac: 'Ahead in Count', bc: 'Behind in Count', ec: 'Even Count', fc: 'Full Count', '2s': 'Two Strikes',
    };

    const SPLIT_GROUPS: Record<string, string> = {
      vl: 'handedness', vr: 'handedness',
      h: 'venue', a: 'venue',
      d: 'dayNight', n: 'dayNight',
      r0: 'baserunners', ron: 'baserunners', risp: 'baserunners',
      ac: 'count', bc: 'count', ec: 'count', fc: 'count', '2s': 'count',
    };

    const SIT_ORDER = ['vl', 'vr', 'h', 'a', 'd', 'n', 'r0', 'ron', 'risp', 'ac', 'bc', 'ec', 'fc', '2s'];

    const MONTH_ORDER = [
      'March/April', 'May', 'June', 'July',
      'August', 'September/October',
      'March', 'April', 'September', 'October',
    ];

    const mapStat = (code: string, label: string, group: string, stat: Record<string, unknown>): SplitRowDto => ({
      splitCode: code,
      label,
      group,
      games: asNumberOrNull(stat.gamesPlayed) ?? 0,
      atBats: asNumberOrNull(stat.atBats) ?? 0,
      hits: asNumberOrNull(stat.hits) ?? 0,
      homeRuns: asNumberOrNull(stat.homeRuns) ?? 0,
      rbi: asNumberOrNull(stat.rbi) ?? 0,
      baseOnBalls: asNumberOrNull(stat.baseOnBalls) ?? 0,
      strikeOuts: asNumberOrNull(stat.strikeOuts) ?? 0,
      avg: asStringOrNull(stat.avg) ?? '.000',
      obp: asStringOrNull(stat.obp) ?? '.000',
      slg: asStringOrNull(stat.slg) ?? '.000',
      ops: asStringOrNull(stat.ops) ?? '.000',
    });

    const fmtStat = (n: number): string => {
      if (!isFinite(n) || n < 0) return '.000';
      const s = n.toFixed(3);
      return s.startsWith('0.') ? s.slice(1) : s;
    };

    try {
      type RawSplitEntry = { split?: { code?: string }; stat?: Record<string, unknown> };
      type RawMonthEntry = { month?: string; stat?: Record<string, unknown> };
      type RawPitchEntry = {
        stat?: {
          play?: {
            details?: {
              type?: { code?: string; description?: string };
              isAtBat?: boolean;
              isPlateAppearance?: boolean;
              isBaseHit?: boolean;
              event?: string;
            };
          };
        };
      };

      // -- situational splits --
      const sitUrl = new URL(`https://statsapi.mlb.com/api/v1/people/${mlbId}/stats`);
      // career uses a dedicated stat type; season uses statSplits + season param
      sitUrl.searchParams.set('stats', timeframe === 'career' ? 'careerStatSplits' : 'statSplits');
      sitUrl.searchParams.set('group', 'hitting');
      sitUrl.searchParams.set('sitCodes', SIT_ORDER.join(','));
      sitUrl.searchParams.set('sportId', '1');
      if (timeframe !== 'career') sitUrl.searchParams.set('season', season);

      // -- monthly splits (season only; career monthly doesn't apply) --
      const monthUrl = new URL(`https://statsapi.mlb.com/api/v1/people/${mlbId}/stats`);
      monthUrl.searchParams.set('stats', 'byMonth');
      monthUrl.searchParams.set('group', 'hitting');
      monthUrl.searchParams.set('season', season);

      // -- pitch-log (aggregated into pitch-type slash splits; season only — pitchLog returns current season regardless) --
      const pitchLogUrl = new URL(`https://statsapi.mlb.com/api/v1/people/${mlbId}/stats`);
      pitchLogUrl.searchParams.set('stats', 'pitchLog');
      pitchLogUrl.searchParams.set('group', 'hitting');
      pitchLogUrl.searchParams.set('season', season);
      pitchLogUrl.searchParams.set('sportId', '1');

      const fetchMonth = timeframe !== 'career';
      const fetchPitchLog = timeframe !== 'career';

      const [sitRes, monthRes, pitchLogRes] = await Promise.all([
        fetch(sitUrl.toString(), { method: 'GET', headers: { Accept: 'application/json' } }),
        fetchMonth
          ? fetch(monthUrl.toString(), { method: 'GET', headers: { Accept: 'application/json' } })
          : Promise.resolve(new Response('{"stats":[]}', { status: 200 })),
        fetchPitchLog
          ? fetch(pitchLogUrl.toString(), { method: 'GET', headers: { Accept: 'application/json' } })
          : Promise.resolve(new Response('{"stats":[]}', { status: 200 })),
      ]);

      const sitData = sitRes.ok
        ? ((await sitRes.json()) as { stats?: Array<{ splits?: RawSplitEntry[] }> })
        : { stats: [] };

      const rawSit: RawSplitEntry[] = Array.isArray(sitData.stats?.[0]?.splits)
        ? sitData.stats![0]!.splits!
        : [];

      const sitSplits: SplitRowDto[] = rawSit
        .filter((s) => s.split?.code != null && SPLIT_LABELS[s.split.code] != null)
        .map((s) => mapStat(s.split!.code!, SPLIT_LABELS[s.split!.code!]!, SPLIT_GROUPS[s.split!.code!]!, s.stat ?? {}))
        .sort((a, b) => SIT_ORDER.indexOf(a.splitCode) - SIT_ORDER.indexOf(b.splitCode));

      const monthData = monthRes.ok
        ? ((await monthRes.json()) as { stats?: Array<{ splits?: RawMonthEntry[] }> })
        : { stats: [] };

      const rawMonth: RawMonthEntry[] = Array.isArray(monthData.stats?.[0]?.splits)
        ? monthData.stats![0]!.splits!
        : [];

      const monthSplits: SplitRowDto[] = rawMonth
        .filter((s) => typeof s.month === 'string' && s.month.trim() !== '')
        .map((s) => {
          const month = s.month!.trim();
          const code = `month_${month.toLowerCase().replace(/[^a-z]/g, '_')}`;
          return mapStat(code, month, 'monthly', s.stat ?? {});
        })
        .sort((a, b) => {
          const ai = MONTH_ORDER.findIndex((m) => a.label.startsWith(m) || m.startsWith(a.label));
          const bi = MONTH_ORDER.findIndex((m) => b.label.startsWith(m) || m.startsWith(b.label));
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });

      // -- aggregate pitchLog entries into per-pitch-type slash splits --
      type PitchBucket = { label: string; ab: number; pa: number; h: number; tb: number; ob: number; bb: number; k: number };
      const buckets = new Map<string, PitchBucket>();

      if (pitchLogRes.ok) {
        const pitchLogData = (await pitchLogRes.json()) as { stats?: Array<{ splits?: RawPitchEntry[] }> };
        const rawPitches: RawPitchEntry[] = Array.isArray(pitchLogData.stats?.[0]?.splits)
          ? pitchLogData.stats![0]!.splits!
          : [];

        for (const entry of rawPitches) {
          const d = entry.stat?.play?.details;
          if (!d) continue;
          const isAb = d.isAtBat === true;
          const isPa = d.isPlateAppearance === true;
          if (!isAb && !isPa) continue;

          const code = d.type?.code;
          const desc = d.type?.description;
          if (!code || !desc) continue;

          let bucket = buckets.get(code);
          if (!bucket) {
            bucket = { label: desc, ab: 0, pa: 0, h: 0, tb: 0, ob: 0, bb: 0, k: 0 };
            buckets.set(code, bucket);
          }

          if (isAb) bucket.ab++;
          bucket.pa++;

          if (d.isBaseHit) {
            bucket.h++;
            const ev = d.event ?? '';
            if (ev === 'double') bucket.tb += 2;
            else if (ev === 'triple') bucket.tb += 3;
            else if (ev === 'home_run') bucket.tb += 4;
            else bucket.tb += 1;
            bucket.ob++;
          }

          const ev = d.event ?? '';
          if (ev === 'walk' || ev === 'intent_walk') {
            bucket.ob++;
            bucket.bb++;
          } else if (ev === 'hit_by_pitch') {
            bucket.ob++;
          } else if (ev === 'strikeout') {
            bucket.k++;
          }
        }
      }

      const pitchTypeSplits: SplitRowDto[] = Array.from(buckets.entries())
        .filter(([, b]) => b.ab > 0)
        .sort(([, a], [, b]) => b.ab - a.ab)
        .map(([code, b]) => {
          const avg = b.ab > 0 ? b.h / b.ab : 0;
          const slg = b.ab > 0 ? b.tb / b.ab : 0;
          const obp = b.pa > 0 ? b.ob / b.pa : 0;
          return {
            splitCode: code,
            label: b.label,
            group: 'pitchType',
            games: 0,
            atBats: b.ab,
            hits: b.h,
            homeRuns: 0,
            rbi: 0,
            baseOnBalls: b.bb,
            strikeOuts: b.k,
            avg: fmtStat(avg),
            obp: fmtStat(obp),
            slg: fmtStat(slg),
            ops: fmtStat(obp + slg),
          };
        });

      return { playerId: mlbId, season: Number(season), timeframe, splits: [...sitSplits, ...pitchTypeSplits, ...monthSplits] };
    } catch (err: unknown) {
      this.log.warn(`[PlayersService] getPlayerSplits failed for ${mlbId}: ${String(err)}`);
      return { playerId: mlbId, season: Number(season), timeframe, splits: [] };
    }
  }

  async getPlayerPitching(mlbId: string, season: string): Promise<PlayerPitchingDto> {
    const SPLIT_LABELS: Record<string, string> = {
      vl: 'vs LHB', vr: 'vs RHB',
      h: 'Home', a: 'Away',
    };
    const SPLIT_ORDER = ['vl', 'vr', 'h', 'a'];

    try {
      // -- pitch arsenal --
      const arsenalUrl = new URL(`https://statsapi.mlb.com/api/v1/people/${mlbId}/stats`);
      arsenalUrl.searchParams.set('stats', 'pitchArsenal');
      arsenalUrl.searchParams.set('group', 'pitching');
      arsenalUrl.searchParams.set('season', season);

      // actual response: split.stat.type.{code,description}, stat.percentage (0-1), stat.averageSpeed
      type RawArsenalSplit = {
        stat?: {
          totalPitches?: number;
          count?: number;
          percentage?: number;
          averageSpeed?: number;
          averageSpin?: number;
          whiffPercent?: number;
          putAway?: number;
          type?: { code?: string; description?: string };
        };
      };

      // Build all three fetch URLs upfront for parallel execution
      const splitUrl = new URL(`https://statsapi.mlb.com/api/v1/people/${mlbId}/stats`);
      splitUrl.searchParams.set('stats', 'statSplits');
      splitUrl.searchParams.set('group', 'pitching');
      splitUrl.searchParams.set('sitCodes', SPLIT_ORDER.join(','));
      splitUrl.searchParams.set('sportId', '1');
      splitUrl.searchParams.set('season', season);

      type RawPitcherSplit = { split?: { code?: string }; stat?: Record<string, unknown> };

      const [arsenalRes, splitRes, seasonStats] = await Promise.all([
        fetch(arsenalUrl.toString(), { method: 'GET', headers: { Accept: 'application/json' } }),
        fetch(splitUrl.toString(), { method: 'GET', headers: { Accept: 'application/json' } }),
        this.fetchSeasonStats(parseInt(mlbId, 10), season),
      ]);

      const arsenalData = arsenalRes.ok
        ? ((await arsenalRes.json()) as { stats?: Array<{ splits?: RawArsenalSplit[] }> })
        : { stats: [] };

      const rawArsenal: RawArsenalSplit[] = Array.isArray(arsenalData.stats?.[0]?.splits)
        ? arsenalData.stats![0]!.splits!
        : [];

      const arsenal: PitchArsenalRowDto[] = rawArsenal
        .filter((s) => s.stat?.type?.code != null)
        .map((s) => {
          const stat = s.stat!;
          const code = stat.type!.code!.toUpperCase();
          return {
            pitchCode: code,
            pitchName: stat.type!.description ?? code,
            usage: (stat.percentage ?? 0) * 100,
            avgVelocity: stat.averageSpeed ?? null,
            avgSpin: stat.averageSpin ?? null,
            whiffPct: stat.whiffPercent ?? null,
            putAwayPct: stat.putAway ?? null,
            count: stat.count ?? stat.totalPitches ?? 0,
          };
        })
        .sort((a, b) => b.usage - a.usage);

      const splitData = splitRes.ok
        ? ((await splitRes.json()) as { stats?: Array<{ splits?: RawPitcherSplit[] }> })
        : { stats: [] };

      const rawSplits: RawPitcherSplit[] = Array.isArray(splitData.stats?.[0]?.splits)
        ? splitData.stats![0]!.splits!
        : [];

      const splits: PitcherSplitRowDto[] = rawSplits
        .filter((s) => s.split?.code != null && SPLIT_LABELS[s.split.code] != null)
        .map((s) => {
          const code = s.split!.code!;
          const stat = s.stat ?? {};
          return {
            splitCode: code,
            label: SPLIT_LABELS[code]!,
            games: asNumberOrNull(stat.gamesPlayed) ?? 0,
            inningsPitched: asStringOrNull(stat.inningsPitched) ?? '0.0',
            era: asStringOrNull(stat.era) ?? '—',
            whip: asStringOrNull(stat.whip) ?? '—',
            strikeOuts: asNumberOrNull(stat.strikeOuts) ?? 0,
            baseOnBalls: asNumberOrNull(stat.baseOnBalls) ?? 0,
            avg: asStringOrNull(stat.avg) ?? '.000',
            ops: asStringOrNull(stat.ops) ?? '.000',
          };
        })
        .sort((a, b) => SPLIT_ORDER.indexOf(a.splitCode) - SPLIT_ORDER.indexOf(b.splitCode));

      const pit = seasonStats?.pitching;
      const seasonTotals: PitcherSeasonTotalsDto | null = pit != null
        ? {
            wins: pit.wins,
            losses: pit.losses,
            inningsPitched: pit.inningsPitched,
            era: pit.era,
            whip: pit.whip,
            strikeOuts: pit.strikeOuts,
          }
        : null;

      return { playerId: mlbId, season: Number(season), arsenal, splits, seasonTotals };
    } catch (err: unknown) {
      this.log.warn(`[PlayersService] getPlayerPitching failed for ${mlbId}: ${String(err)}`);
      return { playerId: mlbId, season: Number(season), arsenal: [], splits: [] };
    }
  }

  async getPlayerDrilldown(mlbId: string, season: string): Promise<PlayerDrilldownDto> {
    const empty: PlayerDrilldownDto = {
      playerId: mlbId, season: Number(season), isPitcher: false,
      gameLog: [], career: [], vsTeam: [],
    };

    try {
      type RawGameLogEntry = {
        date?: string;
        isHome?: boolean;
        isWin?: boolean;
        opponent?: { id?: number; name?: string };
        stat?: Record<string, unknown>;
      };
      type RawCareerEntry = {
        season?: string;
        team?: { name?: string };
        stat?: Record<string, unknown>;
      };
      type RawResponse = { stats?: Array<{ splits?: unknown[] }> };

      const [glHitRes, glPitRes, carHitRes, carPitRes] = await Promise.all([
        fetch(`https://statsapi.mlb.com/api/v1/people/${mlbId}/stats?stats=gameLog&group=hitting&season=${season}`, { headers: { Accept: 'application/json' } }),
        fetch(`https://statsapi.mlb.com/api/v1/people/${mlbId}/stats?stats=gameLog&group=pitching&season=${season}`, { headers: { Accept: 'application/json' } }),
        fetch(`https://statsapi.mlb.com/api/v1/people/${mlbId}/stats?stats=yearByYear&group=hitting`, { headers: { Accept: 'application/json' } }),
        fetch(`https://statsapi.mlb.com/api/v1/people/${mlbId}/stats?stats=yearByYear&group=pitching`, { headers: { Accept: 'application/json' } }),
      ]);

      const [glHitData, glPitData, carHitData, carPitData] = await Promise.all([
        glHitRes.ok ? (glHitRes.json() as Promise<RawResponse>) : Promise.resolve({ stats: [] }),
        glPitRes.ok ? (glPitRes.json() as Promise<RawResponse>) : Promise.resolve({ stats: [] }),
        carHitRes.ok ? (carHitRes.json() as Promise<RawResponse>) : Promise.resolve({ stats: [] }),
        carPitRes.ok ? (carPitRes.json() as Promise<RawResponse>) : Promise.resolve({ stats: [] }),
      ]);

      const rawGlHit = (glHitData.stats?.[0]?.splits ?? []) as RawGameLogEntry[];
      const rawGlPit = (glPitData.stats?.[0]?.splits ?? []) as RawGameLogEntry[];
      const rawCarHit = (carHitData.stats?.[0]?.splits ?? []) as RawCareerEntry[];
      const rawCarPit = (carPitData.stats?.[0]?.splits ?? []) as RawCareerEntry[];

      const isPitcher = rawGlPit.length > rawGlHit.length;
      const rawGl = isPitcher ? rawGlPit : rawGlHit;

      const gameLog: GameLogRowDto[] = rawGl
        .map((e) => {
          const s = e.stat ?? {};
          return {
            date: e.date ?? '',
            opponent: e.opponent?.name ?? '—',
            opponentId: e.opponent?.id ?? 0,
            isHome: e.isHome ?? false,
            isWin: e.isWin ?? null,
            summary: asStringOrNull(s.summary) ?? '',
            atBats: asNumberOrNull(s.atBats),
            hits: asNumberOrNull(s.hits),
            homeRuns: asNumberOrNull(s.homeRuns),
            rbi: asNumberOrNull(s.rbi),
            strikeOuts: asNumberOrNull(s.strikeOuts),
            baseOnBalls: asNumberOrNull(s.baseOnBalls),
            avg: asStringOrNull(s.avg),
            runningAvg: null,
            inningsPitched: asStringOrNull(s.inningsPitched),
            earnedRuns: asNumberOrNull(s.earnedRuns),
            era: asStringOrNull(s.era),
            whip: asStringOrNull(s.whip),
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date)); // chronological for accumulation

      // Compute running season-to-date AVG: accumulate Σhits/ΣatBats oldest→newest.
      // This ensures smooth game-to-game movement and a final value that equals
      // season Σhits/ΣatBats — the same numerator/denominator the season AVG uses.
      let runH = 0;
      let runAB = 0;
      for (const g of gameLog) {
        runH += g.hits ?? 0;
        runAB += g.atBats ?? 0;
        g.runningAvg = runAB > 0 ? runH / runAB : null;
      }

      // Re-sort newest-first for the client
      gameLog.sort((a, b) => b.date.localeCompare(a.date));

      const rawCar = isPitcher ? rawCarPit : rawCarHit;
      const career: CareerRowDto[] = rawCar
        .map((e) => {
          const s = e.stat ?? {};
          return {
            season: e.season ?? '—',
            team: e.team?.name ?? '—',
            gamesPlayed: asNumberOrNull(s.gamesPlayed) ?? 0,
            atBats: asNumberOrNull(s.atBats),
            avg: asStringOrNull(s.avg),
            homeRuns: asNumberOrNull(s.homeRuns),
            rbi: asNumberOrNull(s.rbi),
            ops: asStringOrNull(s.ops),
            inningsPitched: asStringOrNull(s.inningsPitched),
            era: asStringOrNull(s.era),
            whip: asStringOrNull(s.whip),
            strikeOuts: asNumberOrNull(s.strikeOuts),
            wins: asNumberOrNull(s.wins),
            losses: asNumberOrNull(s.losses),
          };
        })
        .sort((a, b) => b.season.localeCompare(a.season));

      // Aggregate game log by opponent (batting stats only; pitchers get empty vsTeam)
      const vsTeam: VsTeamRowDto[] = [];
      if (!isPitcher) {
        const byTeam = new Map<number, { name: string; ab: number; h: number; hr: number; rbi: number; k: number; bb: number; tb: number }>();
        for (const g of gameLog) {
          if (g.opponentId === 0 || g.atBats == null) continue;
          const existing = byTeam.get(g.opponentId) ?? { name: g.opponent, ab: 0, h: 0, hr: 0, rbi: 0, k: 0, bb: 0, tb: 0 };
          existing.ab += g.atBats ?? 0;
          existing.h += g.hits ?? 0;
          existing.hr += g.homeRuns ?? 0;
          existing.rbi += g.rbi ?? 0;
          existing.k += g.strikeOuts ?? 0;
          existing.bb += g.baseOnBalls ?? 0;
          // total bases: H + 2B*1 + 3B*2 + HR*3 — approximate as singles + 3*HR (we don't have doubles/triples per game)
          existing.tb += (g.hits ?? 0) + (g.homeRuns ?? 0) * 3;
          byTeam.set(g.opponentId, existing);
        }
        for (const [id, t] of byTeam) {
          if (t.ab === 0) continue;
          const avgVal = t.ab > 0 ? t.h / t.ab : 0;
          const obp = (t.ab + t.bb) > 0 ? (t.h + t.bb) / (t.ab + t.bb) : 0;
          const slg = t.ab > 0 ? t.tb / t.ab : 0;
          vsTeam.push({
            opponentId: id,
            opponent: t.name,
            games: gameLog.filter((g) => g.opponentId === id).length,
            atBats: t.ab,
            hits: t.h,
            homeRuns: t.hr,
            rbi: t.rbi,
            strikeOuts: t.k,
            baseOnBalls: t.bb,
            avg: avgVal.toFixed(3).replace(/^0/, ''),
            ops: (obp + slg).toFixed(3).replace(/^0/, ''),
          });
        }
        vsTeam.sort((a, b) => b.atBats - a.atBats);
      }

      return { playerId: mlbId, season: Number(season), isPitcher, gameLog, career, vsTeam };
    } catch (err: unknown) {
      this.log.warn(`[PlayersService] getPlayerDrilldown failed for ${mlbId}: ${String(err)}`);
      return empty;
    }
  }

  private async fetchTodayBattingLine(mlbId: string): Promise<BatterOverviewTodayDto> {
    try {
      // Reuse bio cache to find player's current team abbreviation
      const bioCacheKey = `bio:${mlbId}`;
      const cachedBio = this.bioCache.get(bioCacheKey);
      let bioData: Record<string, unknown>;

      if (cachedBio != null && Date.now() < cachedBio.expiresAt) {
        bioData = cachedBio.data;
      } else {
        const res = await fetch(
          `https://statsapi.mlb.com/api/v1/people/${mlbId}?hydrate=currentTeam`,
          { method: 'GET', headers: { Accept: 'application/json' } },
        );
        if (!res.ok) return this.makeEmptyToday();
        bioData = (await res.json()) as Record<string, unknown>;
        this.bioCache.set(bioCacheKey, { data: bioData, expiresAt: Date.now() + this.TTL_BIO_MS });
      }

      const people = Array.isArray(bioData.people) ? (bioData.people as Record<string, unknown>[]) : [];
      const person = people[0] ?? null;
      const currentTeam = (person?.currentTeam ?? {}) as Record<string, unknown>;
      const teamId = typeof currentTeam.id === 'number' ? currentTeam.id : null;

      if (teamId == null) return this.makeEmptyToday();

      // Find today's game for this team — use Eastern time; evening games are next-day UTC
      const todayYmd = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const schedule = await this.mlb.getScheduleByDate(todayYmd);
      const game = schedule.find((g) => g.homeTeamId === teamId || g.awayTeamId === teamId);

      if (game == null || game.providerGameId == null) {
        const season = parseInt(todayYmd.slice(0, 4), 10);
        const lastGame = await this.fetchLastPlayedGame(mlbId, season);
        return this.makeEmptyToday({ gameStatus: 'offday', lastGame });
      }

      const gameId = game.providerGameId;
      const isLive = game.status === 'live';
      const isFinal = game.status === 'final';
      const isHome = game.homeTeamId === teamId;
      const opponent = isHome ? game.awayAbbr : game.homeAbbr;

      if (!isLive && !isFinal) {
        return this.makeEmptyToday({ gameStatus: 'scheduled', opponent, gameId, statLine: `vs ${opponent}` });
      }

      // Fetch live feed (boxscore + linescore in one call)
      const feed = (await this.mlb.getLiveFeed(gameId)) as Record<string, unknown>;
      const liveData = (feed.liveData ?? {}) as Record<string, unknown>;
      const box = (liveData.boxscore ?? {}) as Record<string, unknown>;
      const teams = (box.teams ?? {}) as Record<string, unknown>;
      const linescore = (liveData.linescore ?? {}) as Record<string, unknown>;

      const homeTeam = (teams.home ?? {}) as Record<string, unknown>;
      const awayTeam = (teams.away ?? {}) as Record<string, unknown>;
      const side = isHome ? homeTeam : awayTeam;

      // Derive playerState from linescore.offense (only meaningful for live games)
      const playerState: BatterOverviewTodayDto['playerState'] = (() => {
        if (!isLive) return null;
        const offense = (linescore.offense ?? {}) as Record<string, unknown>;
        const mlbIdNum = Number(mlbId);
        const batterId = ((offense.batter ?? {}) as Record<string, unknown>).id;
        const onDeckId = ((offense.onDeck ?? {}) as Record<string, unknown>).id;
        const inHoleId = ((offense.inHole ?? {}) as Record<string, unknown>).id;
        if (batterId === mlbIdNum) return 'atBat';
        if (onDeckId === mlbIdNum) return 'onDeck';
        if (inHoleId === mlbIdNum) return 'inTheHole';
        return 'idle';
      })();

      const players = (side.players ?? {}) as Record<string, Record<string, unknown>>;
      const playerData = players[`ID${mlbId}`] ?? null;
      const battingStats = ((playerData?.stats ?? {}) as Record<string, unknown>).batting as Record<string, unknown> | undefined;

      if (battingStats == null) {
        // Player is in the game but hasn't accumulated boxscore stats yet (e.g., game just started)
        return this.makeEmptyToday({
          label: isLive ? 'Live' : 'Final',
          statLine: isLive ? 'Game in progress' : 'No stats',
          isLive,
          gameStatus: isLive ? 'live' : 'final',
          opponent,
          gameId,
          playerState,
        });
      }

      const ab = asNumberOrNull(battingStats.atBats) ?? 0;
      const h = asNumberOrNull(battingStats.hits) ?? 0;
      const hr = asNumberOrNull(battingStats.homeRuns) ?? 0;
      const rbi = asNumberOrNull(battingStats.rbi) ?? 0;
      const bb = asNumberOrNull(battingStats.baseOnBalls) ?? 0;
      const k = asNumberOrNull(battingStats.strikeOuts) ?? 0;
      const pa = asNumberOrNull(battingStats.plateAppearances) ?? (ab + bb);
      const avg = typeof battingStats.avg === 'string' ? battingStats.avg : null;

      const parts: string[] = [`${h}-for-${ab}`];
      if (hr > 0) parts.push(`${hr} HR`);
      if (rbi > 0) parts.push(`${rbi} RBI`);
      if (bb > 0) parts.push(`${bb} BB`);
      if (k > 0) parts.push(`${k} K`);

      return {
        label: isLive ? 'Live' : 'Final',
        statLine: parts.length > 0 ? parts.join(', ') : `0-for-${ab}`,
        isLive,
        plateAppearances: pa,
        atBats: ab,
        hits: h,
        homeRuns: hr,
        rbi,
        walks: bb,
        strikeouts: k,
        avg,
        gameStatus: isLive ? 'live' : 'final',
        opponent,
        gameId,
        playerState,
        lastGame: null,
      };
    } catch (err: unknown) {
      this.log.warn(`[PlayersService] fetchTodayBattingLine failed for ${mlbId}: ${String(err)}`);
      return this.makeEmptyToday();
    }
  }

  async getVsPlayer(batterId: number, pitcherId: number): Promise<VsPlayerDto> {
    const url = new URL(`https://statsapi.mlb.com/api/v1/people/${batterId}/stats`);
    url.searchParams.set('stats', 'vsPlayerTotal');
    url.searchParams.set('group', 'hitting');
    url.searchParams.set('opposingPlayerId', String(pitcherId));

    const empty: VsPlayerDto = {
      batterId, pitcherId,
      ab: 0, h: 0, hr: 0, bb: 0, k: 0, avg: null,
      pa: 0, doubles: 0, triples: 0, rbi: 0,
    };

    try {
      const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      if (!res.ok) return empty;

      const payload = (await res.json()) as StatsApiResponse;
      const splits = Array.isArray(payload.stats) && payload.stats.length > 0
        ? payload.stats[0]?.splits
        : null;
      const stat = Array.isArray(splits) && splits.length > 0 ? (splits[0]?.stat ?? null) : null;
      if (stat == null) return empty;

      return {
        batterId,
        pitcherId,
        ab:      asNumberOrNull(stat.atBats)          ?? 0,
        h:       asNumberOrNull(stat.hits)             ?? 0,
        hr:      asNumberOrNull(stat.homeRuns)         ?? 0,
        bb:      asNumberOrNull(stat.baseOnBalls)      ?? 0,
        k:       asNumberOrNull(stat.strikeOuts)       ?? 0,
        avg:     asStringOrNull(stat.avg),
        pa:      asNumberOrNull(stat.plateAppearances) ?? 0,
        doubles: asNumberOrNull(stat.doubles)          ?? 0,
        triples: asNumberOrNull(stat.triples)          ?? 0,
        rbi:     asNumberOrNull(stat.rbi)              ?? 0,
      };
    } catch (err: unknown) {
      this.log.warn(`[PlayersService] getVsPlayer ${batterId}v${pitcherId} failed: ${String(err)}`);
      return empty;
    }
  }
}
