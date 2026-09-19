export type FollowState = 'live' | 'final' | 'scheduled' | 'idle';

export interface FollowRow {
  kind: 'team' | 'player';
  id: string; // team abbr, or player mlbId as a string
  name: string;
  teamAbbr: string | null; // the entity's own team, for the logo/dot
  state: FollowState;
  line: string;
  meta: string;
  gameId: string | null;
  mlbId: number | null;
}
