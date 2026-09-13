import { Injectable, Logger } from '@nestjs/common';
import {
  TeamTransactionsDto,
  TransactionEntryDto,
  TransactionsHeroDto,
} from './dtos/team-transactions.dto';

const CACHE_TTL_MS = 30 * 60 * 1000;
const SEASON_START = '2026-01-01';

type AnyObj = Record<string, unknown>;

type RawTransaction = {
  id: number;
  personId: number | null;
  name: string | null;
  date: string;
  effectiveDate: string;
  typeCode: string;
  description: string;
  fromTeamId: number | null;
  toTeamId: number | null;
};

// Types with no fan-relevant content — spring-training invites, rehab
// assignments, jersey-number changes. Excluded entirely, not just hidden.
const EXCLUDED_TYPES = new Set(['NUM', 'ASG']);

// direction: does this move add the player to the active roster (or org), or
// remove them — derived from the transaction type, never guessed at render
// time (PROMPT_transactions_tab.md §6: "direction must be derivable, not
// guessed... send the resolved value, so the client never parses English").
const IN_TYPES = new Set(['CU', 'SE', 'ACQ', 'SFA', 'SGN']);
const OUT_TYPES = new Set(['OPT', 'DES', 'OUT', 'REL']);
// TR / CLW direction depends on which side of the move this team is on —
// resolved per-transaction against fromTeamId/toTeamId, not a fixed set.

function classifyType(
  t: RawTransaction,
): 'injury' | 'roster' | 'trade' | 'signing' | null {
  if (t.typeCode === 'TR' || t.typeCode === 'CLW') return 'trade';
  if (t.typeCode === 'SFA' || t.typeCode === 'SGN') return 'signing';
  if (t.typeCode === 'SC') {
    if (/injured list/i.test(t.description)) return 'injury';
    return null; // "restricted list" / vague "roster status changed" — too thin to show
  }
  if (['OPT', 'CU', 'SE', 'DES', 'OUT', 'ACQ', 'REL'].includes(t.typeCode))
    return 'roster';
  return null;
}

function classifyDirection(
  t: RawTransaction,
  teamId: number,
): 'in' | 'out' | null {
  if (t.typeCode === 'SC') {
    if (/\bactivated\b/i.test(t.description)) return 'in';
    if (/\bplaced\b|\btransferred\b/i.test(t.description)) return 'out';
    return null;
  }
  if (t.typeCode === 'TR' || t.typeCode === 'CLW') {
    if (t.toTeamId === teamId) return 'in';
    if (t.fromTeamId === teamId) return 'out';
    return null;
  }
  if (IN_TYPES.has(t.typeCode)) return 'in';
  if (OUT_TYPES.has(t.typeCode)) return 'out';
  return null;
}

@Injectable()
export class TeamsTransactionsService {
  private readonly log = new Logger(TeamsTransactionsService.name);
  private readonly cache = new Map<
    number,
    { data: TeamTransactionsDto; expiresAt: number }
  >();

  async getTransactions(teamId: number): Promise<TeamTransactionsDto> {
    const cached = this.cache.get(teamId);
    if (cached != null && Date.now() < cached.expiresAt) return cached.data;

    const result = await this.compute(teamId);
    this.cache.set(teamId, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return result;
  }

  private async fetchRawTransactions(
    teamId: number,
  ): Promise<RawTransaction[]> {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const url = new URL('https://statsapi.mlb.com/api/v1/transactions');
      url.searchParams.set('teamId', String(teamId));
      url.searchParams.set('startDate', SEASON_START);
      url.searchParams.set('endDate', today);

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`MLB transactions API ${res.status}`);

      const payload = (await res.json()) as AnyObj;
      const txs = Array.isArray(payload.transactions)
        ? (payload.transactions as AnyObj[])
        : [];

      return txs.map((t) => {
        const person = (t.person ?? {}) as AnyObj;
        const fromTeam = (t.fromTeam ?? {}) as AnyObj;
        const toTeam = (t.toTeam ?? {}) as AnyObj;
        return {
          id: typeof t.id === 'number' ? t.id : 0,
          personId: typeof person.id === 'number' ? person.id : null,
          name: typeof person.fullName === 'string' ? person.fullName : null,
          date: typeof t.date === 'string' ? t.date : '',
          effectiveDate:
            typeof t.effectiveDate === 'string'
              ? t.effectiveDate
              : typeof t.date === 'string'
                ? t.date
                : '',
          typeCode: typeof t.typeCode === 'string' ? t.typeCode : '',
          description: typeof t.description === 'string' ? t.description : '',
          fromTeamId: typeof fromTeam.id === 'number' ? fromTeam.id : null,
          toTeamId: typeof toTeam.id === 'number' ? toTeam.id : null,
        };
      });
    } catch (err: unknown) {
      this.log.warn(`fetchRawTransactions(${teamId}) failed: ${String(err)}`);
      return [];
    }
  }

  // teamId -> { position, jerseyNumber } for everyone currently on the 40-man.
  // Only covers players still in the org — a player who left long ago (traded,
  // released) simply renders without a jersey number, never a guessed one.
  private async fetchRosterLookup(teamId: number): Promise<{
    map: Map<number, { position: string; jerseyNumber: string }>;
    count: number;
  }> {
    const map = new Map<number, { position: string; jerseyNumber: string }>();
    try {
      const url = new URL(
        `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster`,
      );
      url.searchParams.set('rosterType', '40Man');
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`MLB roster API ${res.status}`);
      const payload = (await res.json()) as AnyObj;
      const roster = Array.isArray(payload.roster)
        ? (payload.roster as AnyObj[])
        : [];
      for (const entry of roster) {
        const person = (entry.person ?? {}) as AnyObj;
        const mlbId = typeof person.id === 'number' ? person.id : null;
        if (mlbId == null) continue;
        const posObj = (entry.position ?? {}) as AnyObj;
        const position =
          typeof posObj.abbreviation === 'string' ? posObj.abbreviation : '';
        const jerseyNumber =
          typeof entry.jerseyNumber === 'string' ? entry.jerseyNumber : '';
        map.set(mlbId, { position, jerseyNumber });
      }
      return { map, count: roster.length };
    } catch (err: unknown) {
      this.log.warn(`fetchRosterLookup(${teamId}) failed: ${String(err)}`);
      return { map, count: 0 };
    }
  }

  private async fetchActiveCount(teamId: number): Promise<number> {
    try {
      const url = new URL(
        `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster`,
      );
      url.searchParams.set('rosterType', 'active');
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`MLB roster API ${res.status}`);
      const payload = (await res.json()) as AnyObj;
      const roster = Array.isArray(payload.roster)
        ? (payload.roster as AnyObj[])
        : [];
      return roster.length;
    } catch (err: unknown) {
      this.log.warn(`fetchActiveCount(${teamId}) failed: ${String(err)}`);
      return 0;
    }
  }

  // Extracts a leading position code from MLB's own description text (e.g.
  // "Houston Astros placed RHP Kaleb Ort..." -> "RHP") as a fallback when the
  // player is no longer on the 40-man roster to look up against.
  private extractPositionFromText(description: string): string | null {
    const m = description.match(
      /\b(RHP|LHP|C|1B|2B|3B|SS|OF|LF|CF|RF|DH|INF|P)\b/,
    );
    return m?.[1] ?? null;
  }

  private async compute(teamId: number): Promise<TeamTransactionsDto> {
    const [raw, rosterLookup, activeCount] = await Promise.all([
      this.fetchRawTransactions(teamId),
      this.fetchRosterLookup(teamId),
      this.fetchActiveCount(teamId),
    ]);

    const entries: TransactionEntryDto[] = [];
    const thisMonthKey = new Date().toISOString().slice(0, 7);
    let movesThisMonth = 0;

    for (const t of raw) {
      if (EXCLUDED_TYPES.has(t.typeCode)) continue;
      if (t.personId == null || t.name == null || t.description === '')
        continue;

      const type = classifyType(t);
      const direction = classifyDirection(t, teamId);
      if (type == null || direction == null) continue;

      const rosterInfo = rosterLookup.map.get(t.personId);
      const textPosition = this.extractPositionFromText(t.description);
      const entry = new TransactionEntryDto();
      entry.mlbId = t.personId;
      entry.name = t.name;
      // Roster position for any pitcher is the generic "P" (MLB's own
      // position code has no throw-hand split); prefer the more specific
      // RHP/LHP the transaction's own description already names when the
      // roster lookup only gives us the generic code.
      entry.position =
        rosterInfo?.position === 'P' && textPosition != null
          ? textPosition
          : (rosterInfo?.position ?? textPosition);
      entry.jerseyNumber =
        rosterInfo?.jerseyNumber && rosterInfo.jerseyNumber !== ''
          ? rosterInfo.jerseyNumber
          : null;
      entry.date = t.effectiveDate || t.date;
      entry.type = type;
      entry.direction = direction;
      entry.description = t.description;
      entries.push(entry);

      if (entry.date.slice(0, 7) === thisMonthKey) movesThisMonth++;
    }

    entries.sort((a, b) => b.date.localeCompare(a.date));

    const hero = new TransactionsHeroDto();
    hero.activeRosterCount = activeCount;
    // MLB's active-roster limit expands from 26 to 28 for September.
    hero.activeRosterLimit = new Date().getUTCMonth() === 8 ? 28 : 26;
    hero.movesThisMonth = movesThisMonth;
    // IL counts come from the 40-man roster's own status codes.
    const ilCounts = await this.fetchIlCounts(teamId);
    hero.ilCount = ilCounts.total;
    hero.il60Count = ilCounts.sixty;
    // MLB's rosterType=40Man query includes 60-day IL players (still org
    // property), but a 60-day IL stint does not occupy a 40-man spot by
    // rule — subtract it so "open" reflects the real roster-management count.
    hero.fortyManCount = Math.max(0, rosterLookup.count - ilCounts.sixty);
    hero.fortyManOpen = Math.max(0, 40 - hero.fortyManCount);

    return {
      transactions: entries,
      hero,
      totalMoves: entries.length,
    };
  }

  private async fetchIlCounts(
    teamId: number,
  ): Promise<{ total: number; sixty: number }> {
    try {
      const url = new URL(
        `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster`,
      );
      url.searchParams.set('rosterType', '40Man');
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`MLB roster API ${res.status}`);
      const payload = (await res.json()) as AnyObj;
      const roster = Array.isArray(payload.roster)
        ? (payload.roster as AnyObj[])
        : [];
      let total = 0;
      let sixty = 0;
      for (const entry of roster) {
        const statusObj = (entry.status ?? {}) as AnyObj;
        const code = typeof statusObj.code === 'string' ? statusObj.code : null;
        if (code === 'D60' || code === 'D15' || code === 'D10') {
          total++;
          if (code === 'D60') sixty++;
        }
      }
      return { total, sixty };
    } catch (err: unknown) {
      this.log.warn(`fetchIlCounts(${teamId}) failed: ${String(err)}`);
      return { total: 0, sixty: 0 };
    }
  }
}
