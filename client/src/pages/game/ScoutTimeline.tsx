import type { ReactElement } from "react";
import { useRef, useCallback, useState } from "react";
import { TeamDot } from "../../components/primitives/TeamDot";
import { TEAMS } from "../../utils/teams";
import "./ScoutTimeline.css";

export interface RunMarker {
  idx: number;
  team: "away" | "home";
  count: number;
  /** "▲3 · Freeman Home Run" — the inning and play, for the tooltip. */
  label?: string;
}

export interface HalfInningBound {
  idx: number;
  half: "top" | "bottom";
  inning: number;
}

interface ScoutTimelineProps {
  total: number;
  markerIdx: number;
  onSeek: (idx: number) => void;
  runMarkers: RunMarker[];
  halfInnings: HalfInningBound[];
  awayAbbr: string;
  homeAbbr: string;
  // The scorecard header's variant: no outer padding, no inning numbers (the
  // scorecard right below labels the innings).
  compact?: boolean;
}

// The whole game as one rail (design GameTimeline; PROMPT_timeline_fixes.md,
// PROMPT_scorecard_header.md §3). Half-inning segments are as wide as their
// pitch counts. Top to bottom: away run lane, the 8px rail, home run lane,
// inning ticks + numbers — the home lane belongs to the rail, so nothing sits
// between them. A 22px logo column on the left puts each team's logo beside
// its own run lane. One 6px dot per run, so a grand slam reads as four. The
// marker is a dark-gold diamond with a hairline through every row.
export function ScoutTimeline({
  total,
  markerIdx,
  onSeek,
  runMarkers,
  halfInnings,
  awayAbbr,
  homeAbbr,
  compact = false,
}: ScoutTimelineProps): ReactElement {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [hoverPct, setHoverPct] = useState<number | null>(null);

  const fractionAt = useCallback((clientX: number): number | null => {
    const el = trackRef.current;
    if (el == null || total === 0) return null;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(clientX - rect.left, rect.width)) / rect.width;
  }, [total]);

  const seekFromPointer = useCallback((e: React.PointerEvent) => {
    const f = fractionAt(e.clientX);
    if (f != null) onSeek(Math.min(Math.round(f * total), total));
  }, [fractionAt, onSeek, total]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    seekFromPointer(e);
  }, [seekFromPointer]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const f = fractionAt(e.clientX);
    setHoverPct(f != null ? f * 100 : null);
    if (dragging.current) seekFromPointer(e);
  }, [fractionAt, seekFromPointer]);

  const onPointerUp = useCallback(() => { dragging.current = false; }, []);
  const onPointerLeave = useCallback(() => { dragging.current = false; setHoverPct(null); }, []);

  const pct = (idx: number): number => (total > 0 ? (idx / total) * 100 : 0);

  // Half-inning segments, each as wide as its pitch count.
  const segments = halfInnings.map((h, i) => ({
    key: `${h.inning}-${h.half}`,
    half: h.half,
    inning: h.inning,
    count: Math.max(1, (i + 1 < halfInnings.length ? halfInnings[i + 1].idx : total) - h.idx),
  }));
  // Where each inning starts — a tick + number from the 2nd inning on.
  const inningStarts = halfInnings.filter((h, i) => h.half === "top" && i > 0);

  const lane = (team: "away" | "home"): ReactElement => (
    <div className={`sct__lane sct__lane--${team}`}>
      {runMarkers.filter((m) => m.team === team).map((m) => (
        <span
          key={m.idx}
          className={`sct__runs sct__runs--${team}`}
          style={{ left: `${pct(m.idx)}%` }}
          title={`${m.count} run${m.count === 1 ? "" : "s"}${m.label != null ? ` · ${m.label}` : ""}`}
        >
          {Array.from({ length: m.count }, (_, j) => <span key={j} className="sct__run" />)}
        </span>
      ))}
    </div>
  );

  const away = TEAMS[awayAbbr];
  const home = TEAMS[homeAbbr];

  return (
    <div className={`sct${compact ? " sct--compact" : ""}`}>
      {/* Each logo centred on its own run lane: away above the rail, home below. */}
      <div className="sct__labels" aria-hidden="true">
        {away != null && <span className="sct__logo sct__logo--away"><TeamDot team={away} size={16} /></span>}
        {home != null && <span className="sct__logo sct__logo--home"><TeamDot team={home} size={16} /></span>}
      </div>
      <div
        className="sct__track"
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
      >
        {lane("away")}
        <div className="sct__rail">
          {segments.map((s) => (
            <div
              key={s.key}
              className={`sct__seg sct__seg--${s.half}`}
              style={{ flex: s.count }}
              title={`${s.half === "top" ? "▲" : "▼"}${s.inning} · ${s.count} pitches`}
            />
          ))}
        </div>
        {lane("home")}
        {!compact && (
          <div className="sct__innings">
            {inningStarts.map((h) => (
              <span key={h.inning} className="sct__inning" style={{ left: `${pct(h.idx)}%` }}>
                <span className="sct__inning-tick" />
                <span className="sct__inning-num">{h.inning}</span>
              </span>
            ))}
          </div>
        )}
        {hoverPct != null && <span className="sct__hover" style={{ left: `${hoverPct}%` }} />}
        {total > 0 && (
          <>
            <span className="sct__marker" style={{ left: `${pct(markerIdx)}%` }} />
            <span className="sct__marker-head" style={{ left: `${pct(markerIdx)}%` }} />
          </>
        )}
      </div>
    </div>
  );
}
