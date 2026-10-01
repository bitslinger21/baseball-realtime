import { useEffect, useState } from "react";
import { TEAMS } from "../../utils/teams";
import type { ClipWire } from "../game/clipTypes";
import { formatClipDuration } from "../game/clipTypes";

// Home Following (PROMPT_video_clips.md §3). Each card is a stack of layers:
// TODAY, then one VIDEO layer per clip of today (game order), then the rest.

export interface FollowFaceWire {
  label: "TODAY" | "SEASON" | "NEXT GAME";
  lines: [string, string];
}

export interface FollowRowWire {
  kind: "team" | "player";
  id: string;
  name: string;
  teamAbbr: string | null;
  state: "live" | "final" | "scheduled" | "idle";
  faces: FollowFaceWire[];
  gameId: string | null;
  mlbId: number | null;
}

export type FollowLayer =
  | { kind: "face"; label: FollowFaceWire["label"]; lines: [string, string] }
  | { kind: "clip"; clip: ClipWire };

// "player:<mlbId>" / "team:<teamId>" — the keys GET /clips/following answers with.
export function clipKey(row: FollowRowWire): string | null {
  if (row.kind === "player") return row.mlbId != null ? `player:${row.mlbId}` : null;
  const id = TEAMS[row.id]?.id;
  return id != null ? `team:${id}` : null;
}

// Only play highlights become layers: they carry an inning and a score, so
// they sort into game order and fill line 3. Interviews, ABS reviews and the
// like (no linked play) stay out of the card.
export function playClips(clips: readonly ClipWire[] | undefined): ClipWire[] {
  return (clips ?? [])
    .filter((c) => c.atBatIndex != null)
    .sort((a, b) => (a.atBatIndex ?? 0) - (b.atBatIndex ?? 0));
}

export function buildLayers(row: FollowRowWire, clips: readonly ClipWire[]): FollowLayer[] {
  const faces: FollowLayer[] = row.faces.map((f) => ({ kind: "face", label: f.label, lines: f.lines }));
  const vids: FollowLayer[] = clips.map((clip) => ({ kind: "clip", clip }));
  return [...faces.slice(0, 1), ...vids, ...faces.slice(1)];
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

// "▲7th"
export function clipHalfInning(c: ClipWire): string | null {
  if (c.inning == null || c.half == null) return null;
  return `${c.half === "top" ? "▲" : "▼"}${ordinal(c.inning)}`;
}

// Line 3 of a VIDEO layer: "▲7th · NYY 7–2 · 0:41" — half-inning, the score
// after the play with the card's own club first (compact, like the TODAY
// layer), then the duration.
export function clipLine3(c: ClipWire, teamAbbr: string | null): string {
  let score: string | null = null;
  const teamId = teamAbbr != null ? TEAMS[teamAbbr]?.id : undefined;
  const subject = c.players.find((p) => p.teamId === teamId) ?? c.players[0];
  if (c.scoreAfter != null && c.half != null && subject != null && teamAbbr != null) {
    // A batter's club is the batting side; a pitcher's or fielder's is the other.
    const batting = c.half === "top" ? "away" : "home";
    const side = subject.role === "batter" ? batting : batting === "away" ? "home" : "away";
    const mine = c.scoreAfter[side];
    const theirs = c.scoreAfter[side === "away" ? "home" : "away"];
    score = `${teamAbbr} ${mine}–${theirs}`;
  }
  return [clipHalfInning(c), score, formatClipDuration(c.durationSec)].filter(Boolean).join(" · ");
}

const FOLLOW_CLIPS_REFRESH_MS = 60_000;

// Today's clips for every followed entity, keyed like clipKey(). Clips are
// additive: a failed fetch leaves the cards exactly as they are without them.
export function useFollowClips(rows: readonly FollowRowWire[]): Record<string, ClipWire[]> {
  const [byKey, setByKey] = useState<Record<string, ClipWire[]>>({});
  const players = rows.filter((r) => r.kind === "player" && r.mlbId != null).map((r) => r.mlbId);
  const teams = rows.filter((r) => r.kind === "team").map((r) => TEAMS[r.id]?.id).filter((id) => id != null);
  const key = `${players.join(",")}|${teams.join(",")}`;

  useEffect(() => {
    if (players.length === 0 && teams.length === 0) {
      setByKey({});
      return;
    }
    let cancelled = false;
    const load = (): void => {
      const params = new URLSearchParams();
      if (players.length > 0) params.set("players", players.join(","));
      if (teams.length > 0) params.set("teams", teams.join(","));
      void fetch(`/api/clips/following?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad response"))))
        .then((res: Record<string, ClipWire[]>) => {
          if (!cancelled) setByKey(res);
        })
        .catch(() => {
          // Keep whatever was last loaded.
        });
    };
    load();
    const id = window.setInterval(load, FOLLOW_CLIPS_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return byKey;
}
