// GET /api/alerts/feed (PROMPT_alerts.md "Data"). Re-sending a storyId
// updates that story in place; an ended story arrives as a new id with
// live:false. The server decides `big` (pop-up vs tray-only).
export type AlertProg =
  | { type: "innings"; done: number }
  | { type: "cycle"; have: string[] }
  | { type: "count"; from: number; to: number; unit: string };

export interface AlertWire {
  id: string;
  storyId: string;
  kind: string;
  big: boolean;
  live: boolean;
  at: string; // ISO
  playerId: number;
  playerShort: string;
  teamAbbr: string;
  title: string;
  sub: string;
  gamePk: string;
  away: string;
  home: string;
  score: [number, number];
  half: string; // "▼8", "Final"
  clipId: string | null;
  prog: AlertProg | null;
}

// Live → the game; over with a clip → the clip; otherwise the game.
export function alertAction(a: AlertWire): string {
  return a.live ? "Enter game →" : a.clipId != null ? "▶ Watch clip" : "Enter game →";
}

// "9:44p" — the viewer's own timezone, no zone label.
export function alertTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(/\s?AM$/, "a")
    .replace(/\s?PM$/, "p");
}
