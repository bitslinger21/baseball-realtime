import { useEffect, useRef, useState } from "react";
import type { ReactElement, RefObject } from "react";
import type { ClipWire } from "./clipTypes";
import { Card } from "../../components/primitives/Card";
import { EdgeButton } from "../../components/primitives/EdgeButton";
import { formatClipDuration } from "./clipTypes";
import type { LazyClipsStatus } from "../../hooks/useGameClips";
import "./GameHighlightsRow.css";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function halfLabel(clip: ClipWire): string {
  if (clip.inning == null) return "";
  return `${clip.half === "top" ? "▲" : "▼"}${ordinal(clip.inning)}`;
}

const SCROLL_STEP = 500;

// The thumbnail is the file's own first second, and a day of highlights can
// be hundreds of clips — so the <video> mounts only as its card nears the
// viewport, instead of every clip opening a media request at once.
function useNearViewport(): [RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el == null || near) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setNear(true);
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  return [ref, near];
}

export function ClipCard({ clip, active, onClick }: { clip: ClipWire; active: boolean; onClick: () => void }): ReactElement {
  const [thumbRef, near] = useNearViewport();
  return (
    <button type="button" className={`ghr__card${active ? " ghr__card--active" : ""}`} onClick={onClick}>
      <div className="ghr__thumb" ref={thumbRef}>
        {near && <video src={`${clip.mp4Url}#t=1`} preload="metadata" muted playsInline className="ghr__thumb-video" />}
        <span className="ghr__thumb-play">
          <svg width="12" height="14" viewBox="0 0 9 10" aria-hidden="true"><path d="M0 0L9 5L0 10Z" fill="#fff" /></svg>
        </span>
        <span className="ghr__thumb-dur num">{formatClipDuration(clip.durationSec)}</span>
      </div>
      <span className="ghr__meta num">{halfLabel(clip)}</span>
      <span className="ghr__title">{clip.title}</span>
    </button>
  );
}

// The game page's last card — every clipped play in this game, in GAME
// ORDER (inning 1 → end). `through`, when given (Scout mode), captions the
// scrub-gated list and drives the empty-state copy (PROMPT_video_clips.md
// §2d/§2e).
//
// Closed by default, and nothing loads while closed (PROMPT_highlights_lazy.md):
// the header is the toggle, and the first open asks the parent to fetch the
// full clip list (`onOpen`). The body isn't mounted until then — no request,
// no thumbnails, no <video>. Closing and reopening keeps what was loaded.
export function GameHighlightsRow({
  clips,
  status,
  onOpen,
  activeId,
  onPlay,
  through,
}: {
  clips: ClipWire[];
  status: LazyClipsStatus;
  onOpen: () => void;
  activeId: string | null;
  onPlay: (id: string) => void;
  through?: string | null;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const loaded = status === "loaded";

  const measure = (): void => {
    const el = ref.current;
    if (el == null) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    if (!open || !loaded) return;
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current != null) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [open, loaded, clips.length]);

  const toggle = (): void => {
    if (!open) onOpen(); // no-op once loaded or loading
    setOpen((o) => !o);
  };

  const scrollBy = (dir: -1 | 1): void => {
    const el = ref.current;
    if (el == null) return;
    el.scrollLeft = el.scrollLeft + dir * SCROLL_STEP;
    measure();
  };

  return (
    <Card padless className="ghr">
      <button
        type="button"
        className={`ghr__head${open ? " ghr__head--open" : ""}`}
        aria-expanded={open}
        onClick={toggle}
      >
        <span className="ghr__eyebrow">Highlights · this game</span>
        {/* The count only once loaded — no placeholder number while closed or loading. */}
        <span className="ghr__count num">
          {loaded
            ? `${clips.length} clip${clips.length === 1 ? "" : "s"}${through != null ? ` · through ${through}` : ""} · game order`
            : ""}
        </span>
        <span className="ghr__toggle">
          {open ? "Hide" : "Show clips"}
          <span className={`ghr__chevron${open ? " ghr__chevron--open" : ""}`} aria-hidden="true">▾</span>
        </span>
      </button>
      {open && (status === "loading" || status === "idle") && (
        <div className="ghr__empty">Loading clips…</div>
      )}
      {open && status === "error" && (
        <div className="ghr__empty">
          Couldn&apos;t load clips.{" "}
          <button type="button" className="ghr__retry" onClick={onOpen}>
            Try again
          </button>
        </div>
      )}
      {open && loaded && clips.length === 0 && (
        <div className="ghr__empty">
          {through != null
            ? `No clips yet — nothing through ${through} has one. They appear here as the marker passes each play.`
            : "No clips for this game yet."}
        </div>
      )}
      {open && loaded && clips.length > 0 && (
        <div className="ghr__scroll-wrap edge-hover">
          <div ref={ref} className="ghr__scroll" onScroll={measure}>
            {clips.map((c) => (
              <ClipCard key={c.id} clip={c} active={c.id === activeId} onClick={() => onPlay(c.id)} />
            ))}
          </div>
          {canLeft && <EdgeButton edge="left" ariaLabel="Earlier clips" onClick={() => scrollBy(-1)} />}
          {canRight && <EdgeButton edge="right" ariaLabel="More clips" onClick={() => scrollBy(1)} />}
        </div>
      )}
    </Card>
  );
}
