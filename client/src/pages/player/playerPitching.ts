export type PitchArsenalRowDto = {
  pitchCode: string;
  pitchName: string;
  usage: number;
  avgVelocity: number | null;
  avgSpin: number | null;
  whiffPct: number | null;
  putAwayPct: number | null;
  count: number;
};

export type LeverageRowDto = {
  leverageCode: string;
  label: string;
  games: number;
  atBats: number;
  hits: number;
  homeRuns: number;
  rbi: number;
  baseOnBalls: number;
  strikeOuts: number;
  avg: string;
  obp: string;
  slg: string;
  ops: string;
};

export type PlayerPitchingDto = {
  playerId: string;
  season: number;
  arsenal: PitchArsenalRowDto[];
  leverage: LeverageRowDto[];
};
