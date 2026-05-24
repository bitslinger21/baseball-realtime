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

export type PitcherSplitRowDto = {
  splitCode: string;
  label: string;
  games: number;
  inningsPitched: string;
  era: string;
  whip: string;
  strikeOuts: number;
  baseOnBalls: number;
  avg: string;
  ops: string;
};

export type PlayerPitchingDto = {
  playerId: string;
  season: number;
  arsenal: PitchArsenalRowDto[];
  splits: PitcherSplitRowDto[];
};
