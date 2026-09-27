import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { ClipWire } from "./clipTypes";
import { Card } from "../../components/primitives/Card";
import { EdgeButton } from "../../components/primitives/EdgeButton";
import { formatClipDuration } from "./clipTypes";
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

function ClipCard({ clip, active, onClick }: { clip: ClipWire; active: boolean; onClick: () => void }): ReactElement {
  return (
    <button type="button" className={`ghr__card${active ? " ghr__card--active" : ""}`} onClick={onClick}>
      <div className="ghr__thumb">
        <video src={`${clip.mp4Url}#t=1`} preload="metadata" muted playsInline className="ghr__thumb-video" />
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
export function GameHighlightsRow({
  clips,
  activeId,
  onPlay,
  through,
}: {
  clips: ClipWire[];
  activeId: string | null;
  onPlay: (id: string) => void;
  through?: string | null;
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const measure = (): void => {
    const el = ref.current;
    if (el == null) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current != null) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [clips.length]);

  const scrollBy = (dir: -1 | 1): void => {
    const el = ref.current;
    if (el == null) return;
    el.scrollLeft = el.scrollLeft + dir * SCROLL_STEP;
    measure();
  };

  return (
    <Card padless className="ghr">
      <div className="ghr__head">
        <span className="ghr__eyebrow">Highlights · this game</span>
        <span className="ghr__count num">
          {clips.length} clip{clips.length === 1 ? "" : "s"}
          {through != null ? ` · through ${through}` : ""} · game order
        </span>
      </div>
      {clips.length === 0 ? (
        <div className="ghr__empty">
          {through != null
            ? `No clips yet — nothing through ${through} has one. They appear here as the marker passes each play.`
            : "No clips for this game yet."}
        </div>
      ) : (
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
