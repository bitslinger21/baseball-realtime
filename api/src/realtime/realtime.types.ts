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
  ts: string; // ISO timestamp from server
}

export interface GameAlert {
  type: string;
  note: string;
  at: string;
  // plus optional fields like batterId, pitcherId, etc
}

export type GameWirePayload = {
  play?: unknown;
  alert?: GameAlert;
};