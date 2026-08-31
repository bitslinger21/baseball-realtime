import { Injectable, Logger } from '@nestjs/common';
import { PlayerSearchResultDto } from './dtos/player-search-result.dto';

type AnyObj = Record<string, unknown>;

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v !== '' ? v : fallback;
}

// Cross-team player name search — the one net-new backend piece the header's
// search field needs. Nothing else (roster fetch, standings) aggregates
// players across all 30 teams; this builds and caches that index.
@Injectable()
export class PlayersSearchService {
  private readonly log = new Logger(PlayersSearchService.name);
  private readonly TTL_MS = 6 * 60 * 60 * 1000;
  private cache: { season: string; data: PlayerSearchResultDto[]; expiresAt: number } | null = null;

  async search(query: string, season: string): Promise<PlayerSearchResultDto[]> {
    const ql = query.trim().toLowerCase();
    if (ql === '') return [];

    const index = await this.getIndex(season);

    // Last-name-first: that is how people search for a player. First-name
    // prefix matching alone buries the obvious hit.
    return index
      .filter((p) => {
        const parts = p.name.trim().split(/\s+/);
        const last = (parts[parts.length - 1] ?? '').toLowerCase();
        const first = (parts[0] ?? '').toLowerCase();
        return last.startsWith(ql) || first.startsWith(ql);
      })
      .slice(0, 6);
  }

  private async getIndex(season: string): Promise<PlayerSearchResultDto[]> {
    if (this.cache != null && this.cache.season === season && Date.now() < this.cache.expiresAt) {
      return this.cache.data;
    }

    const teams = await this.fetchAllTeams();
    const rosters = await Promise.all(
      teams.map((t) => this.fetchRoster(t.id, t.abbr, season)),
    );
    const data = rosters.flat();

    this.cache = { season, data, expiresAt: Date.now() + this.TTL_MS };
    return data;
  }

  private async fetchAllTeams(): Promise<{ id: number; abbr: string }[]> {
    try {
      const res = await fetch('https://statsapi.mlb.com/api/v1/teams?sportId=1');
      if (!res.ok) return [];
      const json = (await res.json()) as { teams?: AnyObj[] };
      return (json.teams ?? [])
        .map((t) => ({ id: t.id as number, abbr: str(t.abbreviation) }))
        .filter((t) => typeof t.id === 'number' && t.abbr !== '');
    } catch (err) {
      this.log.warn(`fetchAllTeams failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  private async fetchRoster(teamId: number, teamAbbr: string, season: string): Promise<PlayerSearchResultDto[]> {
    try {
      const url = new URL(`https://statsapi.mlb.com/api/v1/teams/${teamId}/roster`);
      url.searchParams.set('rosterType', 'active');
      url.searchParams.set('season', season);

      const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      if (!res.ok) return [];

      const payload = (await res.json()) as { roster?: AnyObj[] };
      const roster = payload.roster ?? [];

      return roster.map((entry) => {
        const person = (entry.person ?? {}) as AnyObj;
        const position = (entry.position ?? {}) as AnyObj;
        return {
          mlbId: typeof person.id === 'number' ? person.id : 0,
          name: str(person.fullName, 'Unknown'),
          position: str(position.abbreviation, '?'),
          teamAbbr,
          teamId,
        };
      });
    } catch (err) {
      this.log.warn(`fetchRoster(${teamId}) failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }
}
