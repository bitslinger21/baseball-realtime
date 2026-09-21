export type FollowState = 'live' | 'final' | 'scheduled' | 'idle';

export interface FollowRow {
  kind: 'team' | 'player';
  id: string; // team abbr, or player mlbId as a string
  name: string;
  teamAbbr: string | null; // the entity's own team, for the logo/dot
  // `state` still decides the tile's live/non-live leading edge; the state
  // itself is no longer shown separately — it's folded into each face's own
  // self-describing sentence (PROMPT_home_page.md §6.2). 1-3 faces; the
  // client cycles them via a shared EdgeButton, shown only when length > 1.
  state: FollowState;
  faces: string[];
  gameId: string | null;
  mlbId: number | null;
}
