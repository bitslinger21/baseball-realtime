import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import type { ClipWire } from "./clipTypes";
import "./ClipInPlace.css";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function halfLabel(clip: ClipWire): string {
  if (clip.inning == null) return "";
  return `${clip.half === "top" ? "▲" : "▼"}${ordinal(clip.inning)}`;
}

// Plays a clip inside the at-bat list's own box — the same region the
// scorecard slides into. The box's header row and timeline stay put and
// live; this only covers the content region (PROMPT_video_clips.md §2c,
// option 3). `clips` is this game's Highlights list (already scout-gated by
// the caller), used for the ‹ N of M › step controls.
export function ClipInPlace({
  clips,
  activeId,
  onPick,
  onClose,
}: {
  clips: ClipWire[];
  activeId: string;
  onPick: (id: string) => void;
  onClose: () => void;
}): ReactElement {
  const [failed, setFailed] = useState(false);
  const i = Math.max(0, clips.findIndex((c) => c.id === activeId));
  const clip = clips[i] ?? clips[0];

  useEffect(() => setFailed(false), [activeId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (clip == null) return <></>;
  const n = clips.length;

  return (
    <div className="clip-in-place">
      <div className="clip-in-place__bar">
        <button type="button" className="clip-in-place__back" onClick={onClose}>← At-bats</button>
        <div className="clip-in-place__title">
          <span className="clip-in-place__title-inning num">{halfLabel(clip)}</span>
          <span className="clip-in-place__title-text">{clip.title}</span>
        </div>
        {n > 1 && (
          <div className="clip-in-place__steps">
            <button
              type="button"
              className="clip-in-place__step"
              disabled={i <= 0}
              title="Earlier clip"
              onClick={() => i > 0 && onPick(clips[i - 1].id)}
            >
              ‹
            </button>
            <span className="clip-in-place__step-count num">{i + 1} of {n}</span>
            <button
              type="button"
              className="clip-in-place__step"
              disabled={i >= n - 1}
              title="Later clip"
              onClick={() => i < n - 1 && onPick(clips[i + 1].id)}
            >
              ›
            </button>
          </div>
        )}
      </div>
      <div className="clip-in-place__video-wrap">
        {failed ? (
          <div className="clip-in-place__fallback">
            <span>This clip could not be played</span>
            <span className="clip-in-place__fallback-sub">The game feed is unaffected</span>
          </div>
        ) : (
          <video
            key={clip.id}
            src={clip.mp4Url}
            controls
            autoPlay
            playsInline
            preload="metadata"
            onError={() => setFailed(true)}
            className="clip-in-place__video"
          />
        )}
      </div>
    </div>
  );
}
