// Races (was briefly "September" — rejected: it read as a mistake outside
// the season's last month, since the section is shown all year). Two
// SEPARATE sections, not one shared band — a race has a cut line, a
// deadline and an elimination rule; a chase has none of them.
// PROMPT_home_layout.md §A6-A7.

export interface RaceTeamRow {
  abbr: string;
  displayName: string; // full club name — races earn it, the row's subject IS the club
  record: string; // "86-67"
  wl?: string; // optional win-loss note; column drops entirely when absent
  gamesBack: string; // "-" for the leader; "IN" (not a bare number) for a clinched wild-card spot
  holdingSpot?: boolean; // wild card only — inside the cut line
}

export interface ChaseRow {
  playerName: string;
  teamAbbr: string | null;
  value: string;
}

export interface RaceGroup {
  title: string; // "AL East", "AL Wild Card"
  note: string; // "9 left", "3 spots · 9 left"
  clinchedAbbr: string | null;
  kind: 'division' | 'wildcard';
  rows: RaceTeamRow[];
}

export interface ChaseGroup {
  title: string; // "Batting Average", "Home Runs"
  kind: 'chase';
  // Chases render as two columns — Hitting · Pitching — not a flat grid.
  group: 'hitting' | 'pitching';
  // Hitting is further split into AL/NL sub-groups (each: average, HR,
  // RBI); pitching stays combined. Absent for the combined pitching group.
  league?: 'AL' | 'NL';
  rows: ChaseRow[];
}

export interface RacesResponse {
  mode: 'full' | 'early';
  note: string; // e.g. "9 games left in the regular season" — lives beside the label, not in it
  divisions: RaceGroup[];
  wildCards: RaceGroup[];
  chases: ChaseGroup[];
}
