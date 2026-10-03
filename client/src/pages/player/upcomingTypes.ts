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
  pitchCode?: string; // Statcast code (FF, SL…) — keys the real whiff% lookup
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
  // Real pitch-location zone data has no ingest yet — null means "not available,"
  // never a fabricated flat placeholder standing in for real data.
  heat: number[] | null;
  attack: string;
}

export type StarterInfo =
  | { status: 'confirmed' }
  | { status: 'projected'; confidence: 'High' | 'Medium' | 'Low'; lastStart: string; basis: string }
  | { status: 'tbd' };

export interface UpcomingGame {
  id: string;
  date: string;
  time: string | null; // null while MLB has the start time as TBD
  home: boolean;
  opp: TeamInfo;
  venue: string | null;
  // null = no probable and no rotation projection: the "Starter not announced"
  // state. Never a placeholder pitcher (PROMPT_upcoming_empty.md §2).
  pitcher: Pitcher | null;
  h2h: H2H | null;
  lean: 'batter' | 'pitcher' | 'even';
  read: string;
  starter: StarterInfo;
}

// GET /api/home/upcoming-status/:teamId — which state the tab is in.
export interface UpcomingFact {
  label: string;
  value: string;
  teams?: string[];
  mono?: boolean;
  sub?: string;
}

export interface UpcomingStatus {
  kind: 'games' | 'waiting' | 'eliminated' | 'offseason';
  why: string | null;
  facts: UpcomingFact[];
  link: 'stats' | null;
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
