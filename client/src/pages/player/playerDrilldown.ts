export type GameLogRowDto = {
  date: string;
  opponent: string;
  opponentId: number;
  isHome: boolean;
  isWin: boolean | null;
  summary: string;
  // batting
  atBats: number | null;
  hits: number | null;
  homeRuns: number | null;
  rbi: number | null;
  strikeOuts: number | null;
  baseOnBalls: number | null;
  avg: string | null;
  // pitching
  inningsPitched: string | null;
  earnedRuns: number | null;
  era: string | null;
  whip: string | null;
};

export type CareerRowDto = {
  season: string;
  team: string;
  gamesPlayed: number;
  // batting
  atBats: number | null;
  avg: string | null;
  homeRuns: number | null;
  rbi: number | null;
  ops: string | null;
  // pitching
  inningsPitched: string | null;
  era: string | null;
  whip: string | null;
  strikeOuts: number | null;
  wins: number | null;
  losses: number | null;
};

export type VsTeamRowDto = {
  opponentId: number;
  opponent: string;
  games: number;
  atBats: number;
  hits: number;
  homeRuns: number;
  rbi: number;
  strikeOuts: number;
  baseOnBalls: number;
  avg: string;
  ops: string;
};

export type PlayerDrilldownDto = {
  playerId: string;
  season: number;
  isPitcher: boolean;
  gameLog: GameLogRowDto[];
  career: CareerRowDto[];
  vsTeam: VsTeamRowDto[];
};
