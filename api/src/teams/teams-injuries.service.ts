import { Injectable, Logger } from '@nestjs/common';
import { InjuryEntryDto, TeamInjuriesDto } from './dtos/team-injuries.dto';

const CACHE_TTL_MS = 30 * 60 * 1000;

type AnyObj = Record<string, unknown>;

const IL_STATUS_LABEL: Record<string, '60-day' | '15-day' | '10-day'> = {
  D60: '60-day',
  D15: '15-day',
  D10: '10-day',
};

type InjuredRosterEntry = {
  mlbId: number;
  name: string;
  position: string;
  ilType: '60-day' | '15-day' | '10-day';
};

type Transaction = {
  personId: number | null;
  date: string;
  effectiveDate: string;
  description: string;
};

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Pulls the trailing injury clause off a transaction description, e.g.
// "...placed SS Braden Shewmake on the 10-day injured list. Right adductor
// strain." -> "Right adductor strain." Omits it (returns null) rather than
// guessing when no clean trailing sentence exists.
function extractInjuryClause(description: string): string | null {
  const sentences = description
    .split('. ')
    .map((s) => s.trim())
    .filter((s) => s !== '');
  if (sentences.length < 2) return null;
  const last = sentences[sentences.length - 1].replace(/\.$/, '').trim();
  if (last === '' || /injured list/i.test(last) || last.length > 60)
    return null;
  return last;
}

@Injectable()
export class TeamsInjuriesService {
  private readonly log = new Logger(TeamsInjuriesService.name);
  private readonly cache = new Map<
    number,
    { data: TeamInjuriesDto; expiresAt: number }
  >();

  async getInjuries(teamId: number): Promise<TeamInjuriesDto> {
    const cached = this.cache.get(teamId);
    if (cached != null && Date.now() < cached.expiresAt) return cached.data;

    const result = await this.compute(teamId);
    this.cache.set(teamId, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return result;
  }

  private async fetchInjuredRosterEntries(
    teamId: number,
  ): Promise<InjuredRosterEntry[]> {
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

      const entries: InjuredRosterEntry[] = [];
      for (const entry of roster) {
        const statusObj = (entry.status ?? {}) as AnyObj;
        const code = typeof statusObj.code === 'string' ? statusObj.code : null;
        const ilType = code != null ? IL_STATUS_LABEL[code] : undefined;
        if (ilType == null) continue;

        const person = (entry.person ?? {}) as AnyObj;
        const mlbId = typeof person.id === 'number' ? person.id : null;
        const name =
          typeof person.fullName === 'string' ? person.fullName : null;
        const posObj = (entry.position ?? {}) as AnyObj;
        const position =
          typeof posObj.abbreviation === 'string' ? posObj.abbreviation : '?';
        if (mlbId == null || name == null) continue;

        entries.push({ mlbId, name, position, ilType });
      }
      return entries;
    } catch (err: unknown) {
      this.log.warn(
        `fetchInjuredRosterEntries(${teamId}) failed: ${String(err)}`,
      );
      return [];
    }
  }

  private async fetchTransactions(teamId: number): Promise<Transaction[]> {
    try {
      // Jan 1 floor rather than a rolling window: a currently-injured player's
      // placement transaction can date back to spring training, well past any
      // reasonable "recent" cutoff — a 60-day IL stint started in March is
      // still the currently-active one in September.
      const startDate = `${new Date().getFullYear()}-01-01`;
      const endDate = toDateKey(new Date());
      const url = new URL('https://statsapi.mlb.com/api/v1/transactions');
      url.searchParams.set('teamId', String(teamId));
      url.searchParams.set('startDate', startDate);
      url.searchParams.set('endDate', endDate);

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
        return {
          personId: typeof person.id === 'number' ? person.id : null,
          date: typeof t.date === 'string' ? t.date : '',
          effectiveDate:
            typeof t.effectiveDate === 'string'
              ? t.effectiveDate
              : typeof t.date === 'string'
                ? t.date
                : '',
          description: typeof t.description === 'string' ? t.description : '',
        };
      });
    } catch (err: unknown) {
      this.log.warn(`fetchTransactions(${teamId}) failed: ${String(err)}`);
      return [];
    }
  }

  private async compute(teamId: number): Promise<TeamInjuriesDto> {
    const [injuredEntries, transactions] = await Promise.all([
      this.fetchInjuredRosterEntries(teamId),
      this.fetchTransactions(teamId),
    ]);

    if (injuredEntries.length === 0) return { players: [] };

    const tierRank: Record<string, number> = {
      '60-day': 0,
      '15-day': 1,
      '10-day': 2,
    };

    const players: InjuryEntryDto[] = injuredEntries.map((entry) => {
      const relevant = transactions
        .filter(
          (t) =>
            t.personId === entry.mlbId && /injured list/i.test(t.description),
        )
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
      const latest = relevant[0] ?? null;

      const dto = new InjuryEntryDto();
      dto.mlbId = entry.mlbId;
      dto.name = entry.name;
      dto.position = entry.position;
      dto.ilType = entry.ilType;
      dto.injuryDescription =
        latest != null ? extractInjuryClause(latest.description) : null;
      dto.sinceDate = latest?.effectiveDate ?? latest?.date ?? '';
      dto.expectedReturn = 'Unknown';
      return dto;
    });

    players.sort((a, b) => {
      const tierDiff = tierRank[a.ilType] - tierRank[b.ilType];
      if (tierDiff !== 0) return tierDiff;
      return b.sinceDate.localeCompare(a.sinceDate); // most recently placed first
    });

    return { players };
  }
}
