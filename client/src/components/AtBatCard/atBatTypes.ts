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
}

export interface AtBatState {
  atBatIndex: number;
  batterId: number;
  batterName: string;
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
  finalCount?: string;
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
  overallPlayIndex: number;
}
