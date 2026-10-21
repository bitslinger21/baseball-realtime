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

// Where a ball in play went (F-006).
export interface Spray {
  angle: number; // degrees from straight-away CF; −45 = 3B line, +45 = 1B line
  dist: number; // feet
  traj: string; // MLB hitData.trajectory, verbatim
}

export interface RunnerMove {
  runnerId: number;
  runnerName?: string;
  start: "1B" | "2B" | "3B" | null; // null = the batter, from home
  end: "1B" | "2B" | "3B" | "score" | null; // null when put out
  isOut: boolean;
  outBase: string | null;
  playIndex: number | null; // the playEvents index that caused it
  event?: string;
  errorCode?: string; // 'E6' / 'E6T' when an error caused this move
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
  // An ABS challenge of this pitch's ball/strike call (by the batter, pitcher
  // or catcher), once decided: the call stood or was reversed.
  challenge?: "confirmed" | "overturned";
  // MLB's runner movements caused at or after this pitch, before the next one
  // (server: poller.service.ts → buildPitchFrames). Drives the scorecard's
  // runner paths (GamePage → runnerFinalBaseByAtBat).
  runners?: RunnerMove[];
  scorebookCode?: string;
  // F-006 — on an at-bat's last frame: where the ball went, and the fielders
  // under an FC code ('6-4', scorecard box only).
  spray?: Spray;
  scorebookSub?: string;
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
  iqUpdate?: IqUpdate;
};

// What the hook returns to pages/components
export interface RealtimeState {
  plays: readonly PlayUpdate[];
  isConnected: boolean;
  connectionError: string | null;
}