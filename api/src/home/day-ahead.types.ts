// Day ahead — the What's Hot section's fallback body/tail
// (PROMPT_home_layout.md §A4). A SHORTLIST of today's games picked by a
// lower-bar significance heuristic, never "the first four by start time" —
// on a 15-game Sunday that's four one-o'clock games.

export interface DayAheadRow {
  providerGameId: string;
  awayAbbr: string;
  homeAbbr: string;
  startTimeUtc: string | null;
  awayPitcherName: string | null;
  homePitcherName: string | null;
  // A short, real reason this game made the shortlist — "AL West race",
  // "Rivalry" — or null when it's here only because the list needed
  // filling. Never fabricated; absence is honest.
  stake: string | null;
}

export interface DayAheadResponse {
  games: DayAheadRow[];
  totalCount: number;
}
