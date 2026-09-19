// client/src/realtime/types.ts

export type TeamRhe = { runs: number; hits: number; errors: number };
export type LiveLinescore = { away: TeamRhe; home: TeamRhe };

export type IqCandidateKind = "Leverage" | "Streak" | "Rare";

export interface IqCandidate {
  kind: IqCandidateKind;
  score: number;
  text: string;
}

export interface IqBlock {
  candidates: IqCandidate[];
  suggested: string[];
}

// Mirror of the server-side PlayUpdate wire shape
export interface PlayUpdate {
  providerGameId: string;
  inning: number;
  half: "top" | "bottom";
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
  pitchTypeCode?: string;
  pitchSpeedMph?: number;
  atBatIndex?: number;
  playResult?: string;
  isFinalPitchOfAtBat?: boolean;
  scorebookCode?: string;
  runnerOutBase?: '1B' | '2B' | '3B';
  onBaseFirst?: string;
  onBaseSecond?: string;
  onBaseThird?: string;
  hitKind?: string;
  batterId?: number;
  pitchX?: number;
  pitchZ?: number;
  strikeZoneTop?: number;
  strikeZoneBottom?: number;
  batterGameAB?: number;
  batterGameH?: number;
  batterGameR?: number;
  batterGameRBI?: number;
  linescore?: LiveLinescore;
  ts?: string;
  playKey?: string;
  homeTeamWinProbability?: number;
  leverageIndex?: number;
  status?: 'live' | 'final' | 'scheduled';
  iq?: IqBlock;
}

export type GameHydratePayload = {
  gameId: string;
  plays: PlayUpdate[];
};

// Mirror of server-side GameAlert
export interface GameAlert {
  type: string;
  note: string;
  at: string;

  // Optional metadata
  batterId?: string;
  batterName?: string;
  pitcherId?: string;
  pitcherName?: string;
  needs?: string;
  ipOuts?: number;
}

// Follow-up patch for a play whose wire push already went out before its
// Baseball IQ generation finished — attach `iq` to the play matching
// `atBatIndex`, nothing else. See HANDOFF_baseball_iq_backend.md §1.
export type IqUpdate = {
  providerGameId: string;
  atBatIndex: number;
  iq: IqBlock;
};

// Envelope for websocket messages
export type GameWirePayload = {
  play?: PlayUpdate;
  alert?: GameAlert;
  iqUpdate?: IqUpdate;
};

// What the hook returns to pages/components
export interface RealtimeState {
  plays: readonly PlayUpdate[];
  alerts: readonly GameAlert[];
  isConnected: boolean;
  connectionError: string | null;
}