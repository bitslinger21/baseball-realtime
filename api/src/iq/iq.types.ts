export type IqCandidateKind = 'Leverage' | 'Streak' | 'Rare';

export interface IqCandidate {
  kind: IqCandidateKind;
  score: number;
  text: string;
}

export interface IqBlock {
  candidates: IqCandidate[];
  suggested: string[];
}

export const EMPTY_IQ_BLOCK: IqBlock = { candidates: [], suggested: [] };

export type TriggerReason =
  | 'scoring_play'
  | 'pitching_change'
  | 'milestone'
  | 'leverage_crossing'
  | 'streak_crossing'
  | 'half_inning_gap';

export interface SituationalSplitLine {
  situation: string; // e.g. "RISP", "vs LHP", "2 outs"
  avg: number | null;
  obp: number | null;
  slg: number | null;
  pa: number;
}

export interface ParkFactorResult {
  wouldClearParks: number;
  totalParks: number;
  distanceFt: number | null;
  hitParkWallFt: number | null;
}

export interface GeneratorContext {
  providerGameId: string;
  inning: number;
  half: 'top' | 'bottom';
  outs: number;
  balls: number;
  strikes: number;
  bases: { on1: boolean; on2: boolean; on3: boolean };
  homeScore: number;
  awayScore: number;
  homeAbbr?: string;
  awayAbbr?: string;

  batterId?: number;
  batterName?: string;
  batterAvg?: number;
  batterSplits?: SituationalSplitLine[];

  pitcherId?: number;
  pitcherName?: string;
  pitcherEra?: number;
  pitcherSplits?: SituationalSplitLine[];

  description?: string;
  playResult?: string;
  scorebookCode?: string;

  leverageIndex?: number;
  homeTeamWinProbability?: number;

  parkFactor?: ParkFactorResult | null;

  triggerReason: TriggerReason;

  // Compact recent-history digest — not the raw play array. Kept short so the
  // prompt stays cheap; enough for "no hit allowed yet" / streak-style framing.
  recentPlaysDigest: string[];

  // Fact fingerprints already surfaced this game (repetition memory) — the
  // model is asked not to repeat these, verbatim or as a near-variant.
  alreadyShown: string[];
}
