// Postseason bracket + series drawer (PROMPT_postseason_bracket.md). Replaces
// Races on Home once all 12 berths are clinched — a condition, not a date.
//
// Score-formatting rule (§4): a dash only ever means a SERIES record; a game
// score is always team + runs per side. That's why game scores travel as
// structured sides here and are never pre-formatted into a "3–1" string.

export type PostseasonRound = 'wc' | 'ds' | 'cs' | 'ws';

export interface PostseasonTeam {
  id: number;
  abbr: string;
}

// One side of a series. Exactly one of `team` / `options` / `label` describes
// who it is: a known club, one of two possible clubs (a logo pair), or a word
// ("AL champ") when not even the candidates are narrowed down yet.
export interface PostseasonSide {
  team: PostseasonTeam | null;
  options: string[]; // abbrs — "BOS / TOR" before the feeding series is decided
  label: string | null; // "AL champ", "TBD"
  seed: number | null;
  wins: number;
  eliminated: boolean;
}

export interface PostseasonGameSide {
  abbr: string;
  runs: number | null;
}

export interface PostseasonRecap {
  id: string;
  url: string;
  durationSec: number;
}

export interface PostseasonGame {
  gamePk: string;
  number: number;
  date: string; // officialDate, yyyy-mm-dd
  startTime: string | null; // ISO; null while MLB lists the time as TBD
  host: string | null; // abbr of the home club; null while the host isn't known
  state: 'final' | 'live' | 'scheduled' | 'ifNecessary';
  away: PostseasonGameSide;
  home: PostseasonGameSide;
  // final only
  innings: number | null; // set only when it went extra — renders "F/10"
  winner: string | null;
  loser: string | null;
  save: string | null;
  note: string | null; // one notable line, or null (no filler)
  recap: PostseasonRecap | null;
  // live only
  inning: string | null; // "▼6"
  situation: string | null; // "1 out · runner on 1st"
  // scheduled only
  probables: { away: string | null; home: string | null } | null;
}

export interface PostseasonSeries {
  id: string; // MLB's own series id ("D_1")
  round: PostseasonRound;
  league: 'AL' | 'NL' | null;
  label: string; // "AL Wild Card", "ALDS", "World Series"
  bestOf: number;
  state: 'upcoming' | 'current' | 'finished';
  high: PostseasonSide; // the top row of the card
  low: PostseasonSide;
  status: string; // "Yankees lead 2–1" / "Series tied 1–1" / "Phillies won 3–1"
  waitingOn: string | null; // upcoming only — "Waiting on ALDS"
  startDate: string | null; // first game's officialDate
  games: PostseasonGame[];
}

export interface PostseasonBracket {
  alwc: PostseasonSeries[]; // [feeds ALDS[0], feeds ALDS[1]]
  alds: PostseasonSeries[]; // [seed-1 series, seed-2 series]
  alcs: PostseasonSeries | null;
  ws: PostseasonSeries | null;
  nlcs: PostseasonSeries | null;
  nlds: PostseasonSeries[];
  nlwc: PostseasonSeries[];
}

export interface PostseasonResponse {
  active: boolean; // all 12 berths clinched (or the postseason is already under way)
  note: string; // "Division Series · 8 clubs left"
  bracket: PostseasonBracket | null;
}
