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

@Injectable()
export class LeadersService {
  private readonly log = new Logger(LeadersService.name);
  private readonly cache = new Map<string, { data: LeagueLeadersDto; expiresAt: number }>();
  private readonly TTL_MS = 5 * 60 * 1_000;

  async getLeagueLeaders(season: string): Promise<LeagueLeadersDto> {
    const cached = this.cache.get(season);
    if (cached != null && Date.now() < cached.expiresAt) return cached.data;

    try {
      const url = new URL('https://statsapi.mlb.com/api/v1/stats/leaders');
      url.searchParams.set('leaderCategories', ALL_CATEGORY_KEYS.join(','));
      url.searchParams.set('season', season);
      url.searchParams.set('sportId', '1');
      url.searchParams.set('limit', '10');

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
        batting: BATTING_CATEGORIES.map((c) => buildCategory(c.key, c.label, 'hitting')),
        pitching: PITCHING_CATEGORIES.map((c) => buildCategory(c.key, c.label, 'pitching')),
      };

      this.cache.set(season, { data: result, expiresAt: Date.now() + this.TTL_MS });
      return result;
    } catch (err: unknown) {
      this.log.warn(`[LeadersService] getLeagueLeaders failed: ${String(err)}`);
      return { season: Number(season), batting: [], pitching: [] };
    }
  }
}
