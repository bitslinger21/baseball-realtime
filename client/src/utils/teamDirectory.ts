import type { StandingTeamDto } from '@bitslinger21/baseball-realtime-client';
import { TEAMS } from './teams';

// One source for the team list — consumed by both Standings and the Teams
// directory page, so picking a sort order on one screen can't silently change
// what the other page's grouping means.

export const DIV_ORDER = ['East', 'Central', 'West'];
export const LEAGUE_ORDER = ['American League', 'National League'];

export type DivisionData = { divisionName: string; teams: StandingTeamDto[] };
export type LeagueData = { leagueName: string; divisions: DivisionData[] };

export function groupByLeague(teams: readonly StandingTeamDto[]): LeagueData[] {
  const lgMap = new Map<string, Map<string, StandingTeamDto[]>>();
  for (const t of teams) {
    if (!lgMap.has(t.leagueName)) lgMap.set(t.leagueName, new Map());
    const divMap = lgMap.get(t.leagueName)!;
    if (!divMap.has(t.divisionName)) divMap.set(t.divisionName, []);
    divMap.get(t.divisionName)!.push(t);
  }
  return [...lgMap.keys()]
    .sort((a, b) => LEAGUE_ORDER.indexOf(a) - LEAGUE_ORDER.indexOf(b))
    .map((leagueName) => {
      const divMap = lgMap.get(leagueName)!;
      const divisions = [...divMap.entries()]
        .map(([divisionName, ts]) => ({
          divisionName,
          teams: [...ts].sort((a, b) => a.rank - b.rank),
        }))
        .sort((a, b) => {
          const ai = DIV_ORDER.findIndex((s) => a.divisionName.includes(s));
          const bi = DIV_ORDER.findIndex((s) => b.divisionName.includes(s));
          return ai - bi;
        });
      return { leagueName, divisions };
    });
}

// Flat list of all 6 divisions (2 leagues × 3), in the same stable order as
// groupByLeague — the Teams page's division grid reads this directly instead
// of nesting by league.
export function flatDivisions(teams: readonly StandingTeamDto[]): DivisionData[] {
  return groupByLeague(teams).flatMap((lg) => lg.divisions);
}

export function mlbLogoUrl(abbr: string): string | null {
  const id = TEAMS[abbr]?.id;
  return id != null ? `https://www.mlbstatic.com/team-logos/${id}.svg` : null;
}

export function divShortName(divisionName: string): string {
  return divisionName
    .replace('American League ', 'AL ')
    .replace('National League ', 'NL ');
}
