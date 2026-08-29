import { Injectable } from '@nestjs/common';
import { MlbApiService } from '../providers/mlb/mlb.service';
import { TeamsMetaService } from '../teams/teams-meta.service';
import { StandingTeamDto, WinsByDayEntryDto } from './dtos/standing-team.dto';

type AnyObj = Record<string, unknown>;

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v !== '' ? v : fallback;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

// MLB Stats API may return league/division without name — map from stable IDs.
const LEAGUE_NAMES: Record<number, string> = {
  103: 'American League',
  104: 'National League',
};
const DIVISION_NAMES: Record<number, string> = {
  200: 'AL West',
  201: 'AL East',
  202: 'AL Central',
  203: 'NL West',
  204: 'NL East',
  205: 'NL Central',
};

function leagueName(obj: AnyObj): string {
  return str(obj.name) || LEAGUE_NAMES[num(obj.id)] || 'Unknown League';
}

function divisionName(obj: AnyObj): string {
  return str(obj.name) || DIVISION_NAMES[num(obj.id)] || 'Unknown Division';
}

const WINS_BY_DAY_TTL_MS = 6 * 60 * 60 * 1000; // 6h — a completed game day doesn't change mid-cache

@Injectable()
export class StandingsService {
  private readonly winsByDayCache = new Map<
    string,
    { data: WinsByDayEntryDto[]; expiresAt: number }
  >();

  public constructor(
    private readonly mlb: MlbApiService,
    private readonly teamsMeta: TeamsMetaService,
  ) {}

  private async getWinsByDay(teamId: number, season: string): Promise<WinsByDayEntryDto[]> {
    const cacheKey = `${teamId}:${season}`;
    const cached = this.winsByDayCache.get(cacheKey);
    if (cached != null && Date.now() < cached.expiresAt) return cached.data;

    const games = await this.mlb.getSeasonScheduleForTeam(teamId, season);
    const completed = games
      .filter((g) => g.status === 'final' && g.teamScore !== null && g.oppScore !== null)
      .sort((a, b) => a.gameDate.localeCompare(b.gameDate));

    // Collapse doubleheaders to the day's final cumulative total.
    const byDate = new Map<string, number>();
    let wins = 0;
    for (const g of completed) {
      if (g.teamScore! > g.oppScore!) wins++;
      byDate.set(g.gameDate, wins);
    }
    const data: WinsByDayEntryDto[] = Array.from(byDate.entries()).map(([date, w]) => ({
      date,
      wins: w,
    }));

    this.winsByDayCache.set(cacheKey, { data, expiresAt: Date.now() + WINS_BY_DAY_TTL_MS });
    return data;
  }

  public async getStandings(season: string): Promise<StandingTeamDto[]> {
    const records = await this.mlb.getStandings(season);
    const results: StandingTeamDto[] = [];

    // Resolve every team's real per-day cumulative wins up front, in parallel,
    // keyed by abbreviation — the fabricated PRNG series this replaces
    // (buildWinsSeries) is gone from the client.
    const teamIdByAbbr = new Map<string, number>();
    for (const record of records) {
      const rec = record as AnyObj;
      const teamRecords = Array.isArray(rec.teamRecords) ? (rec.teamRecords as AnyObj[]) : [];
      for (const tr of teamRecords) {
        const team = (tr.team ?? {}) as AnyObj;
        const abbr = str(team.abbreviation, 'UNK');
        const teamId = num(team.id, 0);
        if (teamId > 0) teamIdByAbbr.set(abbr, teamId);
      }
    }
    const winsByDayEntries = await Promise.all(
      Array.from(teamIdByAbbr.entries()).map(async ([abbr, teamId]) => {
        try {
          return [abbr, await this.getWinsByDay(teamId, season)] as const;
        } catch {
          return [abbr, [] as WinsByDayEntryDto[]] as const;
        }
      }),
    );
    const winsByDayByAbbr = new Map(winsByDayEntries);

    for (const record of records) {
      const rec = record as AnyObj;
      const league = (rec.league ?? {}) as AnyObj;
      const division = (rec.division ?? {}) as AnyObj;
      const lgName = leagueName(league);
      const divName = divisionName(division);

      const teamRecords = Array.isArray(rec.teamRecords)
        ? (rec.teamRecords as AnyObj[])
        : [];

      teamRecords.forEach((tr: AnyObj, idx: number) => {
        const team = (tr.team ?? {}) as AnyObj;
        const abbr = str(team.abbreviation, 'UNK');
        const teamName = str(team.teamName ?? team.name, 'Unknown');
        const displayName = str(team.name, teamName);

        const wins = num(tr.wins, 0);
        const losses = num(tr.losses, 0);
        const pct = str(tr.leagueRecord != null
          ? (tr.leagueRecord as AnyObj).pct
          : tr.winningPercentage, '.000');
        const gamesBack = str(tr.gamesBack, '-');

        const splitRecords = Array.isArray((tr.records as AnyObj)?.splitRecords)
          ? ((tr.records as AnyObj).splitRecords as AnyObj[])
          : [];
        const lastTenRecord = splitRecords.find((s) => s.type === 'lastTen');
        const lastTen = lastTenRecord != null
          ? `${num(lastTenRecord.wins)}-${num(lastTenRecord.losses)}`
          : '?-?';

        const homeRec = splitRecords.find((s) => s.type === 'home');
        const awayRec = splitRecords.find((s) => s.type === 'away');
        const oneRunRec = splitRecords.find((s) => s.type === 'oneRun');

        const streakCode = str((tr.streak as AnyObj)?.streakCode, '-');

        const meta = this.teamsMeta.getByAbbr(abbr);

        const dto = new StandingTeamDto();
        dto.abbr = abbr;
        dto.teamName = teamName;
        dto.displayName = displayName;
        dto.leagueName = lgName;
        dto.divisionName = divName;
        dto.rank = idx + 1;
        dto.wins = wins;
        dto.losses = losses;
        dto.pct = pct;
        dto.gamesBack = gamesBack;
        dto.lastTen = lastTen;
        dto.streak = streakCode;
        dto.logoUrl = meta?.logoUrl ?? null;
        dto.primaryColorHex = meta?.primaryColorHex ?? null;
        dto.homeRecord = homeRec != null ? `${num(homeRec.wins)}–${num(homeRec.losses)}` : null;
        dto.awayRecord = awayRec != null ? `${num(awayRec.wins)}–${num(awayRec.losses)}` : null;
        dto.oneRunRecord = oneRunRec != null ? `${num(oneRunRec.wins)}–${num(oneRunRec.losses)}` : null;
        dto.venue = meta?.venue ?? null;
        dto.city = meta?.city ?? null;
        dto.founded = meta?.founded ?? null;
        dto.winsByDay = winsByDayByAbbr.get(abbr) ?? [];

        results.push(dto);
      });
    }

    return results;
  }
}
