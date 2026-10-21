import type { Spray } from "../../realtime/types";

export interface PitchEntry {
  seq: number;
  pitchTypeCode: string;
  pitchTypeName: string;
  result: string;
  speedMph?: number;
  count: string;
  pitchX?: number;
  pitchZ?: number;
  isLastPitch: boolean;
  renderKey: string;
  // An ABS challenge of this pitch's call, once decided.
  challenge?: "confirmed" | "overturned";
}

export interface AtBatState {
  atBatIndex: number;
  batterId: number;
  batterName: string;
  // The pitcher who actually faced this at-bat — credits scorecard pitching
  // tallies to whoever was on the mound for THIS play, not the whole
  // inning's totals (PROMPT_scorecard_pitcher_tallies.md). Name is the only
  // stable identifier the play-by-play feed carries per play (no numeric id).
  pitcherName?: string;
  inning: number;
  half: "top" | "bottom";
  pitches: PitchEntry[];
  strikeZoneTop?: number;
  strikeZoneBottom?: number;
  gameAB?: number;
  gameH?: number;
  gameR?: number;
  gameRBI?: number;
  firstPitchRenderKey: string;
  isFirstInInning: boolean;
  result?: string;
  scorebookCode?: string;
  // F-006: where the ball went; the fielders under an FC code.
  spray?: Spray;
  scorebookSub?: string;
  hitKind?: string;
  finalCount?: string;
  isHalfEnd?: boolean;
  // The projected next batter between one PA ending and his first pitch — not
  // an at-bat yet (no pitches), shown as "up next · 0-0" (PROMPT_oct19.md item 3, Part B).
  upNext?: boolean;
}

// Season slash-line data fetched from /players/:id/overview
export interface BatterInfo {
  mlbId: number;
  avg: string;
  obp: string;
  slg: string;
}

export interface AtBatHistoryState {
  currentAtBat: AtBatState | null;
  completedAtBats: AtBatState[];
  lastInningKey: string | null;
}
