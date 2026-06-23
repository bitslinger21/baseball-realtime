import type { TeamInfo } from '../../utils/teams';
import type { SplitRowDto } from '@bitslinger21/baseball-realtime-client';

export interface PitchStat {
  avg: string;
  slg: string;
  whiff: string;
  n: number;
}

export interface ArsenalEntry {
  type: string;
  share: number;
  velo: string;
}

export interface MeetingEntry {
  date: string;
  res: string;
  detail: string;
  tone: 'positive' | 'neutral' | 'negative';
}

export interface H2H {
  pa: number; ab: number; h: number; hr: number; rbi: number; bb: number; k: number;
  avg: string; obp: string; slg: string; ops: string;
  lastFaced: string | null;
  log: MeetingEntry[];
}

export interface Pitcher {
  name: string;
  throws: 'R' | 'L';
  num: number;
  initials: string;
  mlbId: number | null;
  rookie?: true;
  record: string; era: string; whip: string; k9: string; ip: string;
  arsenal: ArsenalEntry[];
  heat: number[];
  attack: string;
}

export type StarterInfo =
  | { status: 'confirmed' }
  | { status: 'projected'; confidence: 'High' | 'Medium' | 'Low'; lastStart: string; basis: string }
  | { status: 'tbd' };

export interface UpcomingGame {
  id: string;
  date: string;
  time: string;
  home: boolean;
  opp: TeamInfo;
  venue: string;
  pitcher: Pitcher;
  h2h: H2H | null;
  lean: 'batter' | 'pitcher' | 'even';
  read: string;
  starter: StarterInfo;
}

export interface SplitDisplayRow {
  label: string;
  line: string;
  ops: string;
  delta: string;
  hot: boolean;
}

export interface LiveSplits {
  vsHand: Record<'R' | 'L', SplitDisplayRow | null>;
  vsClass: SplitDisplayRow[];
  pitchType: SplitRowDto[];
}
