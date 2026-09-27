import type { ReactElement } from "react";
import "./WatchButton.css";

interface WatchButtonProps {
  durationSec: number;
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
}

function PlayGlyph({ size = 9 }: { size?: number }): ReactElement {
  return (
    <svg width={size * 0.9} height={size} viewBox="0 0 9 10" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <path d="M0 0L9 5L0 10Z" fill="currentColor" />
    </svg>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// A finished at-bat with a clip gets this at the right end of its line,
// before the expand chevron (PROMPT_video_clips.md §2a). Neutral at rest so
// it never competes with the scoring chip on the same line; ink on hover or
// while that clip is playing.
export function WatchButton({ durationSec, active, onClick }: WatchButtonProps): ReactElement {
  return (
    <button
      type="button"
      className={`watch-btn${active ? " watch-btn--active" : ""}`}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      title={active ? "Playing" : "Watch"}
    >
      <PlayGlyph />
      <span>{active ? "Playing" : "Watch"}</span>
      <span className="watch-btn__dur num">{formatDuration(durationSec)}</span>
    </button>
  );
}
