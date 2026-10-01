export type FollowState = 'live' | 'final' | 'scheduled' | 'idle';

// One layer of a Following card (PROMPT_video_clips.md §3a): a label plus two
// content lines, rendered at a fixed height so cycling never moves the rail.
export interface FollowFace {
  label: 'TODAY' | 'SEASON' | 'NEXT GAME';
  lines: [string, string];
}

export interface FollowRow {
  kind: 'team' | 'player';
  id: string; // team abbr, or player mlbId as a string
  name: string;
  teamAbbr: string | null; // the entity's own team, for the logo/dot
  // `state` decides the card's live leading edge; the state itself is told by
  // the TODAY layer. Order: TODAY, SEASON, then NEXT GAME when there's a game
  // today. The client inserts today's video layers right after TODAY.
  state: FollowState;
  faces: FollowFace[];
  gameId: string | null;
  mlbId: number | null;
}
