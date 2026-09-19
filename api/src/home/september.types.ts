// "September" (was "Races") — PROMPT_home_page.md §6.5. Named for the
// destination the season is heading toward, not the current month.

export interface SeptemberTeamRow {
  abbr: string;
  record: string; // "88-65"
  gamesBack: string; // "-" for the leader/clinched team, else "2.0"
  holdingSpot?: boolean; // wild card only — inside the cut line
}

export interface SeptemberChaseRow {
  playerName: string;
  value: string;
}

export interface SeptemberRace {
  title: string; // "AL East", "AL Wild Card", "AL Batting"
  note: string; // "9 left", "3 spots · 9 left", or "" for a chase
  clinchedAbbr: string | null; // race-level green pill; null when still live
  kind: 'division' | 'wildcard' | 'chase';
  teamRows: SeptemberTeamRow[];
  chaseRows: SeptemberChaseRow[];
}

export interface SeptemberResponse {
  mode: 'full' | 'early';
  divisions: SeptemberRace[];
  wildCards: SeptemberRace[];
  chases: SeptemberRace[];
}
