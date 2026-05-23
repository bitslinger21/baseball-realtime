import { Injectable } from '@nestjs/common';
import { MlbApiService } from '../providers/mlb/mlb.service';
import { TeamsMetaService } from '../teams/teams-meta.service';
import { StandingTeamDto } from './dtos/standing-team.dto';

type AnyObj = Record<string, unknown>;

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v !== '' ? v : fallback;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

@Injectable()
export class StandingsService {
  public constructor(
    private readonly mlb: MlbApiService,
    private readonly teamsMeta: TeamsMetaService,
  ) {}

  public async getStandings(season: string): Promise<StandingTeamDto[]> {
    const records = await this.mlb.getStandings(season);
    const results: StandingTeamDto[] = [];

    for (const record of records) {
      const rec = record as AnyObj;
      const league = (rec.league ?? {}) as AnyObj;
      const division = (rec.division ?? {}) as AnyObj;
      const leagueName = str(league.name, 'Unknown League');
      const divisionName = str(division.name, 'Unknown Division');

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

        const streakCode = str((tr.streak as AnyObj)?.streakCode, '-');

        const meta = this.teamsMeta.getByAbbr(abbr);

        const dto = new StandingTeamDto();
        dto.abbr = abbr;
        dto.teamName = teamName;
        dto.displayName = displayName;
        dto.leagueName = leagueName;
        dto.divisionName = divisionName;
        dto.rank = idx + 1;
        dto.wins = wins;
        dto.losses = losses;
        dto.pct = pct;
        dto.gamesBack = gamesBack;
        dto.lastTen = lastTen;
        dto.streak = streakCode;
        dto.logoUrl = meta?.logoUrl ?? null;
        dto.primaryColorHex = meta?.primaryColorHex ?? null;

        results.push(dto);
      });
    }

    return results;
  }
}
