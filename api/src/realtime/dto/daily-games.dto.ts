export type GamePhase =
  | 'SCHEDULED'
  | 'LIVE'
  | 'FINAL'
  | 'DELAYED'
  | 'POSTPONED'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'WARMUP'
  | 'UNKNOWN';

export type InningHalf = 'TOP' | 'BOTTOM';

export type DailyTeamStatus = {
  teamId: number;
  teamName: string;
  teamAbbrev: string;
  logoUrl: string; // you already have this pattern somewhere
  score: number | null; // null unless LIVE/FINAL
};

export type DailyGameStatus = {
  gameId: string;
  dateKey: string; // YYYY-MM-DD (the selected date)
  startTimeUtcIso: string; // client formats to local time
  phase: GamePhase;

  away: DailyTeamStatus;
  home: DailyTeamStatus;

  // LIVE only
  inning: number | null;
  half: InningHalf | null;
  outs: number | null;

  // Column 4 convenience (optional, but keeps UI dead-simple)
  statusText: string; // e.g. "7:10 PM" OR "▲5 2 outs" OR "Final" OR "PPD"
};

export type DailyGamesSnapshot = {
  dateKey: string;
  asOfUtcIso: string;
  games: readonly DailyGameStatus[];
  venue?: string | null;
  city?: string | null;
  state?: string | null;
};
