// The player-page Upcoming tab's state (PROMPT_upcoming_empty.md). When kind
// is "games" the tab renders the normal rail; otherwise it renders one card of
// a "why" sentence plus only the facts that are known.
export interface UpcomingFact {
  label: string; // "Next series", "Opponent", "Game 1", "Last game", "Opening Day"
  value: string;
  teams?: string[]; // abbrs drawn as logos before the value (a pair = "one of these")
  mono?: boolean;
  sub?: string;
}

export interface UpcomingStatus {
  kind: 'games' | 'waiting' | 'eliminated' | 'offseason';
  why: string | null;
  facts: UpcomingFact[];
  link: 'stats' | null; // "See his season in Stats"
}
