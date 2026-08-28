import { Injectable, Logger } from '@nestjs/common';

export interface RosterPlayerDto {
  mlbId: number;
  name: string;
  jersey: string;
  position: string;
  avg: string | null;
  hr: number | null;
  rbi: number | null;
  ops: string | null;
}

type AnyObj = Record<string, unknown>;

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : null;
}

function numOrNull(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

@Injectable()
export class TeamsRosterService {
  private readonly log = new Logger(TeamsRosterService.name);
  private readonly cache = new Map<string, { data: RosterPlayerDto[]; expiresAt: number }>();
  private readonly TTL_MS = 10 * 60 * 1_000;

  async getRoster(teamId: number, season: string): Promise<RosterPlayerDto[]> {
    const cacheKey = `${teamId}:${season}`;
    const cached = this.cache.get(cacheKey);
    if (cached != null && Date.now() < cached.expiresAt) return cached.data;

    try {
      const url = new URL(`https://statsapi.mlb.com/api/v1/teams/${teamId}/roster`);
      url.searchParams.set('rosterType', 'active');
      url.searchParams.set('season', season);
      url.searchParams.set('hydrate', `person(stats(type=season,group=hitting,season=${season}))`);

      const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`MLB roster API ${res.status}`);

      const payload = (await res.json()) as AnyObj;
      const roster = Array.isArray(payload.roster) ? (payload.roster as AnyObj[]) : [];

      const players: RosterPlayerDto[] = roster.map((entry) => {
        const person = (entry.person ?? {}) as AnyObj;
        const mlbId = typeof person.id === 'number' ? person.id : 0;
        const name = strOrNull(person.fullName) ?? '—';
        const jersey = strOrNull(entry.jerseyNumber) ?? '—';
        const posObj = (entry.position ?? {}) as AnyObj;
        const position = strOrNull(posObj.abbreviation) ?? '?';

        const statsArr = Array.isArray((person.stats as unknown)) ? (person.stats as AnyObj[]) : [];
        const seasonHitting = statsArr.find(
          (s) => (s.group as AnyObj)?.displayName === 'hitting' && Array.isArray(s.splits) && (s.splits as AnyObj[]).length > 0,
        );
        const statLine = seasonHitting != null
          ? ((seasonHitting.splits as AnyObj[])[0]?.stat ?? {}) as AnyObj
          : {} as AnyObj;

        return {
          mlbId,
          name,
          jersey,
          position,
          avg: strOrNull(statLine.avg),
          hr: numOrNull(statLine.homeRuns),
          rbi: numOrNull(statLine.rbi),
          ops: strOrNull(statLine.ops),
        };
      });

      const batters = players.filter(
        (p) => !['P', 'SP', 'RP'].includes(p.position),
      );

      this.cache.set(cacheKey, { data: batters, expiresAt: Date.now() + this.TTL_MS });
      return batters;
    } catch (err: unknown) {
      this.log.warn(`[TeamsRosterService] getRoster(${teamId}, ${season}) failed: ${String(err)}`);
      return [];
    }
  }
}
