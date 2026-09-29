import { useEffect, useState } from "react";
import { TEAMS, type TeamInfo } from "../../utils/teams";

// Wire shapes for GET /api/home/postseason (PROMPT_postseason_bracket.md).
// Hand-typed like the rest of Home's endpoints (races, day-ahead).

export interface PostseasonTeamWire {
  id: number;
  abbr: string;
}

export interface PostseasonSideWire {
  team: PostseasonTeamWire | null;
  options: string[]; // a logo pair: "BOS / TOR"
  label: string | null; // a word: "AL champ"
  seed: number | null;
  wins: number;
  eliminated: boolean;
}

export interface PostseasonGameSideWire {
  abbr: string;
  runs: number | null;
}

export interface PostseasonRecapWire {
  id: string;
  url: string;
  durationSec: number;
}

export interface PostseasonGameWire {
  gamePk: string;
  number: number;
  date: string; // yyyy-mm-dd
  startTime: string | null; // ISO; null while TBD
  host: string | null;
  state: "final" | "live" | "scheduled" | "ifNecessary";
  away: PostseasonGameSideWire;
  home: PostseasonGameSideWire;
  innings: number | null;
  winner: string | null;
  loser: string | null;
  save: string | null;
  note: string | null;
  recap: PostseasonRecapWire | null;
  inning: string | null;
  situation: string | null;
  probables: { away: string | null; home: string | null } | null;
}

export interface PostseasonSeriesWire {
  id: string;
  round: "wc" | "ds" | "cs" | "ws";
  league: "AL" | "NL" | null;
  label: string;
  bestOf: number;
  state: "upcoming" | "current" | "finished";
  high: PostseasonSideWire;
  low: PostseasonSideWire;
  status: string;
  waitingOn: string | null;
  startDate: string | null;
  games: PostseasonGameWire[];
}

export interface PostseasonBracketWire {
  alwc: PostseasonSeriesWire[];
  alds: PostseasonSeriesWire[];
  alcs: PostseasonSeriesWire | null;
  ws: PostseasonSeriesWire | null;
  nlcs: PostseasonSeriesWire | null;
  nlds: PostseasonSeriesWire[];
  nlwc: PostseasonSeriesWire[];
}

export interface PostseasonWire {
  active: boolean;
  note: string;
  bracket: PostseasonBracketWire | null;
}

// A live game moves the bracket footer, so this polls faster than Races.
const POSTSEASON_REFRESH_MS = 60_000;

export function usePostseason(): PostseasonWire | null {
  const [data, setData] = useState<PostseasonWire | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = (): void => {
      void fetch("/api/home/postseason")
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad response"))))
        .then((res: PostseasonWire) => {
          if (!cancelled) setData(res);
        })
        .catch(() => {
          // Leave whatever was last successfully loaded.
        });
    };
    load();
    const id = window.setInterval(load, POSTSEASON_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return data;
}

// TeamDot needs a TeamInfo; an abbr the static table doesn't know still gets
// a letter-mark (and the real logo, when the id is known).
export function teamInfo(abbr: string, id?: number): TeamInfo {
  return TEAMS[abbr] ?? { abbr, id: id ?? 0, name: abbr, short: abbr, primary: "#5c574f", secondary: "#cfc8b4" };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad2 = (n: number): string => String(n).padStart(2, "0");

// "Mon 10/12" from a yyyy-mm-dd calendar date (no timezone shift).
export function formatDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${wd} ${pad2(m)}/${pad2(d)}`;
}

// "Wed 10/07 7:08" — the local start time; date only while MLB has it TBD.
export function formatWhen(date: string, startTime: string | null): string {
  if (startTime == null) return formatDay(date);
  const t = new Date(startTime);
  const h = t.getHours() % 12 === 0 ? 12 : t.getHours() % 12;
  return `${formatDay(date)} ${h}:${pad2(t.getMinutes())}`;
}

// Recap duration: 449 → "7:29".
export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
}

// Score rule (§4): a game score pairs each club with its own runs, leader
// first — "HOU 3 CLE 1". Never "3–1"; a dash only ever means a series.
export function leaderFirst(g: PostseasonGameWire): [PostseasonGameSideWire, PostseasonGameSideWire] {
  return (g.home.runs ?? 0) > (g.away.runs ?? 0) ? [g.home, g.away] : [g.away, g.home];
}
