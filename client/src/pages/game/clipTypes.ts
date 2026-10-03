// Mirror of the server-side ClipDto (PROMPT_video_clips.md §6b).
export interface ClipWire {
  id: string;
  gameId: string;
  atBatIndex: number | null;
  inning: number | null;
  half: "top" | "bottom" | null;
  title: string;
  description: string;
  durationSec: number;
  mp4Url: string;
  thumbnailUrl: string | null;
  players: { id: number; teamId: number; role: string }[];
  scoreAfter: { away: number; home: number } | null;
  publishedAt: string;
}

// GET /games/:gameId/clip-index — just what Watch buttons and scorecard
// marks need, without any clip's media metadata.
export type ClipIndexWire = Pick<ClipWire, "id" | "atBatIndex" | "inning" | "half" | "durationSec">;

// "00:00:30" -> "0:30", "00:01:05" -> "1:05" — also handles a plain integer
// seconds count (durationSec), which is what the wire actually sends.
export function formatClipDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
