import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { LivePill } from "../../components/primitives/Pill";
import type { ClipWire } from "../game/clipTypes";
import { formatClipDuration } from "../game/clipTypes";
import { getAutoplayVideo } from "../../utils/videoPrefs";
import { clipHalfInning } from "./following";
import "./ClipOverlay.css";

// A Following card's clips, played ON TOP of Home (PROMPT_video_clips.md §3b,
// option 1 — Home has no at-bat list to play inside). Video + title +
// description on the left, that card's clips in game order on the right. While
// its game is live, a thin strip above the video keeps the score current.

// GET /api/games/:gameId/live-strip
interface LiveStripWire {
  state: "live" | "final" | "scheduled";
  away: { abbr: string; runs: number };
  home: { abbr: string; runs: number };
  inning: number | null;
  half: "top" | "bottom" | null;
  situation: string | null;
}

const LIVE_STRIP_REFRESH_MS = 15_000;

function useLiveStrip(gameId: string | null, live: boolean): LiveStripWire | null {
  const [strip, setStrip] = useState<LiveStripWire | null>(null);
  useEffect(() => {
    if (gameId == null || !live) {
      setStrip(null);
      return;
    }
    let cancelled = false;
    const load = (): void => {
      void fetch(`/api/games/${encodeURIComponent(gameId)}/live-strip`)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad response"))))
        .then((s: LiveStripWire) => {
          if (!cancelled) setStrip(s);
        })
        .catch(() => {});
    };
    load();
    const id = window.setInterval(load, LIVE_STRIP_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [gameId, live]);
  return strip;
}

function LiveStrip({ strip }: { strip: LiveStripWire }): ReactElement {
  const half = strip.inning != null ? `${strip.half === "bottom" ? "▼" : "▲"}${strip.inning}` : null;
  return (
    <div className="clipov__live">
      <LivePill />
      {half != null && <span className="clipov__live-half num">{half}</span>}
      {/* A game score: away + runs – runs + home (the dash form, PROMPT_score_format_revert.md). */}
      <span className="clipov__live-score num">
        {strip.away.abbr} {strip.away.runs} – {strip.home.runs} {strip.home.abbr}
      </span>
      {strip.situation != null && <span className="clipov__live-note">· {strip.situation}</span>}
    </div>
  );
}

function Thumb({ clip }: { clip: ClipWire }): ReactElement {
  return (
    <span className="clipov__thumb">
      {/* No thumbnails are supplied — the file's own first second stands in. */}
      <video src={`${clip.mp4Url}#t=1`} preload="metadata" muted playsInline aria-hidden="true" tabIndex={-1} />
      <span className="clipov__thumb-dur num">{formatClipDuration(clip.durationSec)}</span>
    </span>
  );
}

export function ClipOverlay({
  title,
  clips,
  activeId,
  gameId,
  live,
  onPick,
  onClose,
}: {
  title: string; // "Aaron Judge · today"
  clips: readonly ClipWire[];
  activeId: string;
  gameId: string | null;
  live: boolean;
  onPick: (id: string) => void;
  onClose: () => void;
}): ReactElement {
  const clip = clips.find((c) => c.id === activeId) ?? clips[0];
  const liveStrip = useLiveStrip(gameId, live);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="clipov" role="dialog" aria-modal="true" aria-label={title}>
      <div className="clipov__backdrop" onClick={onClose} />
      <div className="clipov__panel">
        <div className="clipov__main">
          {liveStrip != null && liveStrip.state === "live" && <LiveStrip strip={liveStrip} />}
          <div className="clipov__video">
            {clip != null && (
              <video
                key={clip.id}
                src={clip.mp4Url}
                controls
                playsInline
                autoPlay={getAutoplayVideo()}
                preload="metadata"
              />
            )}
          </div>
          {clip != null && (
            <div className="clipov__info">
              <div className="clipov__heading">
                {clipHalfInning(clip) != null && <span className="clipov__half num">{clipHalfInning(clip)}</span>}
                <span className="clipov__title">{clip.title}</span>
              </div>
              {clip.description !== "" && clip.description !== clip.title && (
                <p className="clipov__desc">{clip.description}</p>
              )}
            </div>
          )}
        </div>
        <div className="clipov__side">
          <div className="clipov__side-inner">
            <div className="clipov__side-head">
              <span className="clipov__side-title">
                {title} <span className="clipov__side-count num">{clips.length}</span>
              </span>
              <button type="button" className="clipov__close" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="clipov__list">
              {clips.map((c) => {
                const on = c.id === clip?.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`clipov__item${on ? " clipov__item--on" : ""}`}
                    onClick={() => onPick(c.id)}
                  >
                    <Thumb clip={c} />
                    <span className="clipov__item-text">
                      <span className="clipov__item-meta num">
                        {[clipHalfInning(c), on ? "now playing" : null].filter(Boolean).join(" · ")}
                      </span>
                      <span className="clipov__item-title">{c.title}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
