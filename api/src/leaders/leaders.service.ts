import { Injectable, Logger } from '@nestjs/common';
import { LeagueLeadersDto, LeaderCategoryDto, LeaderEntryDto } from './dtos/league-leaders.dto';

const BATTING_CATEGORIES: Array<{ key: string; label: string }> = [
  { key: 'homeRuns', label: 'Home Runs' },
  { key: 'battingAverage', label: 'Batting Avg' },
  { key: 'runsBattedIn', label: 'RBI' },
  { key: 'runs', label: 'Runs' },
  { key: 'hits', label: 'Hits' },
  { key: 'stolenBases', label: 'Stolen Bases' },
  { key: 'onBasePlusSlugging', label: 'OPS' },
];

const PITCHING_CATEGORIES: Array<{ key: string; label: string }> = [
  { key: 'earnedRunAverage', label: 'ERA' },
  { key: 'strikeouts', label: 'Strikeouts' },
  { key: 'wins', label: 'Wins' },
  { key: 'saves', label: 'Saves' },
  { key: 'walksAndHitsPerInningPitched', label: 'WHIP' },
  { key: 'inningsPitched', label: 'Innings' },
];

const ALL_CATEGORY_KEYS = [
  ...BATTING_CATEGORIES.map((c) => c.key),
  ...PITCHING_CATEGORIES.map((c) => c.key),
];

type RawLeaderEntry = {
  rank?: number;
  value?: string;
  person?: { id?: number; fullName?: string };
  team?: { id?: number; name?: string };
};

type RawLeaderCategory = {
  leaderCategory?: string;
  statGroup?: string;
  leaders?: RawLeaderEntry[];
};

type RawLeadersResponse = {
  leagueLeaders?: RawLeaderCategory[];
};

const LEAGUE_IDS: Record<string, number> = { AL: 103, NL: 104 };

function formatThroughDate(): string {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

@Injectable()
export class LeadersService {
  private readonly log = new Logger(LeadersService.name);
  private readonly cache = new Map<string, { data: LeagueLeadersDto; expiresAt: number }>();
  private readonly TTL_MS = 5 * 60 * 1_000;

  async getLeagueLeaders(season: string, league: 'all' | 'AL' | 'NL' = 'all', teamId?: number): Promise<LeagueLeadersDto> {
    const cacheKey = teamId != null ? `${season}:team-${teamId}` : `${season}:${league}`;
    const cached = this.cache.get(cacheKey);
    if (cached != null && Date.now() < cached.expiresAt) return cached.data;

    try {
      const url = new URL('https://statsapi.mlb.com/api/v1/stats/leaders');
      url.searchParams.set('leaderCategories', ALL_CATEGORY_KEYS.join(','));
      url.searchParams.set('season', season);
      url.searchParams.set('sportId', '1');
      if (teamId != null) {
        url.searchParams.set('teamId', String(teamId));
        url.searchParams.set('limit', '3');
      } else {
        url.searchParams.set('limit', '10');
        if (league !== 'all') url.searchParams.set('leagueId', String(LEAGUE_IDS[league]));
      }

      const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`MLB API ${res.status}`);

      const payload = (await res.json()) as RawLeadersResponse;
      const raw = Array.isArray(payload.leagueLeaders) ? payload.leagueLeaders : [];

      const buildCategory = (key: string, label: string, statGroup: string): LeaderCategoryDto => {
        const match = raw.find(
          (c) => c.leaderCategory === key && c.statGroup === statGroup,
        );
        const leaders: LeaderEntryDto[] = (match?.leaders ?? []).map((e) => ({
          rank: e.rank ?? 0,
          playerId: e.person?.id ?? 0,
          playerName: e.person?.fullName ?? '—',
          teamName: e.team?.name ?? '—',
          teamId: e.team?.id ?? 0,
          value: e.value ?? '—',
        }));
        return { category: key, label, leaders };
      };

      const result: LeagueLeadersDto = {
        season: Number(season),
        throughDate: formatThroughDate(),
        batting: BATTING_CATEGORIES.map((c) => buildCategory(c.key, c.label, 'hitting')),
        pitching: PITCHING_CATEGORIES.map((c) => buildCategory(c.key, c.label, 'pitching')),
      };

      this.cache.set(cacheKey, { data: result, expiresAt: Date.now() + this.TTL_MS });
      return result;
    } catch (err: unknown) {
      this.log.warn(`[LeadersService] getLeagueLeaders failed: ${String(err)}`);
      return { season: Number(season), batting: [], pitching: [] };
    }
  }
}
