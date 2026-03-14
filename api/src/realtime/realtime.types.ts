export interface PlayUpdate {
  providerGameId: string;
  inning: number;
  half: 'top' | 'bottom';
  outs: number;
  balls: number;
  strikes: number;
  bases: {
    on1: boolean;
    on2: boolean;
    on3: boolean;
  };
  homeScore: number;
  awayScore: number;
  description?: string;
  batterName?: string;
  pitcherName?: string;
  batterAvg?: number;
  pitcherEra?: number;
  pitchType?: string;
  pitchSpeedMph?: number;
  ts: string;
  playKey?: string;
}

export interface GameAlert {
  type: string;
  note: string;
  at: string;
}

export type GameWirePayload = {
  play?: unknown;
  alert?: GameAlert;
};

export type GameHydratePayload = {
  gameId: string;
  plays: PlayUpdate[];
};