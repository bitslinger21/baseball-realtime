export type TeamLineScoreDto = {
  runs: number;
  hits: number;
  errors: number;
};

export type BatterLineDto = {
  playerId: number;
  name: string;
  battingOrder?: string | null;

  ab: number;
  r: number;
  h: number;
  rbi: number;
  bb: number;
  so: number;
  hr: number;
};

export type PitcherLineDto = {
  playerId: number;
  name: string;
  jerseyNumber?: string | null;

  ip: string; // e.g. "5.2"
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;

  pitches?: number | null;
  strikes?: number | null;
};

export type BoxScoreSideDto = {
  teamAbbr: string;
  linescore: TeamLineScoreDto;
  batting: readonly BatterLineDto[];
  pitching: readonly PitcherLineDto[];
};

export type BoxScoreDto = {
  providerGameId: string;
  away: BoxScoreSideDto;
  home: BoxScoreSideDto;
  ts: string;
};

export async function fetchBoxScore(providerGameId: string): Promise<BoxScoreDto> {
  const res = await fetch(`http://localhost:3000/boxscore/${providerGameId}`);
  if (!res.ok) {
    throw new Error(`boxscore failed: ${res.status}`);
  }
  return (await res.json()) as BoxScoreDto;
}