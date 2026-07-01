export enum BroadcastEventType {
  AT_BAT_COMPLETE = 'AT_BAT_COMPLETE',
  SCORING_PLAY = 'SCORING_PLAY',
  PITCHING_CHANGE = 'PITCHING_CHANGE',
  INNING_TRANSITION = 'INNING_TRANSITION',
  GAME_START = 'GAME_START',
  GAME_END = 'GAME_END',
}

export interface BroadcastGameState {
  inning: number;
  half: 'top' | 'bottom';
  outs: number;
  bases: { on1: boolean; on2: boolean; on3: boolean };
  balls: number;
  strikes: number;
  homeScore: number;
  awayScore: number;
  homeAbbr: string;
  awayAbbr: string;
  pitcherName: string | null;
  pitcherId: number | null;
  batterName: string | null;
  batterId: number | null;
}

export interface BroadcastEvent {
  gameId: string;
  playKey: string;
  eventType: BroadcastEventType;
  description: string;
  atBatResult: string | null;
  isAtBatComplete: boolean;
  gameState: BroadcastGameState;
}
