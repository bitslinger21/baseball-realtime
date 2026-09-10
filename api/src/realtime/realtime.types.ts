import type { IqBlock } from '../iq/iq.types';

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
  iq?: IqBlock;
}

export interface GameAlert {
  type: string;
  note: string;
  at: string;
}

// Follow-up patch for a play whose wire push already went out before its
// Baseball IQ generation finished — the client attaches `iq` to the play
// matching `atBatIndex` rather than waiting on it before showing the play.
// Carries providerGameId itself (like `play`/`alert` do) because the client's
// socket receives 'play' events globally, not scoped per game room — the
// payload is the only way it knows which game's play array to patch.
export type IqUpdate = {
  providerGameId: string;
  atBatIndex: number;
  iq: IqBlock;
};

export type GameWirePayload = {
  play?: unknown;
  alert?: GameAlert;
  iqUpdate?: IqUpdate;
};

export type GameHydratePayload = {
  gameId: string;
  plays: PlayUpdate[];
};
