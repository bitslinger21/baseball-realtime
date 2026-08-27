import type { ReactElement } from "react";
import { useRef, useCallback } from "react";
import "./ScoutTimeline.css";

export interface RunMarker {
  idx: number;
  team: "away" | "home";
  count: number;
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
}

export function ScoutTimeline({
  total,
  markerIdx,
  onSeek,
  runMarkers,
  halfInnings,
}: ScoutTimelineProps): ReactElement {
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const seekFromPointer = useCallback((e: React.PointerEvent) => {
    const el = wrapRef.current;
    if (el == null || total === 0) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    onSeek(Math.min(Math.round((x / rect.width) * total), total));
  }, [onSeek, total]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    seekFromPointer(e);
  }, [seekFromPointer]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging.current) seekFromPointer(e);
  }, [seekFromPointer]);

  const onPointerUp = useCallback(() => { dragging.current = false; }, []);

  const markerPct = total > 0 ? (markerIdx / total) * 100 : 0;
  const awayRuns = runMarkers.filter(m => m.team === "away");
  const homeRuns  = runMarkers.filter(m => m.team === "home");

  // Rail segments — alternating color per half-inning
  const railSegs = halfInnings.map((h, i) => ({
    startPct: (h.idx / total) * 100,
    endPct: i + 1 < halfInnings.length ? (halfInnings[i + 1].idx / total) * 100 : 100,
    half: h.half,
  }));

  // Inning labels — only top-of-inning transitions after the first
  const inningTicks = halfInnings.filter((h, i) => h.half === "top" && i > 0);

  return (
    <div
      className="sct"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div className="sct__rail-wrap" ref={wrapRef}>

        {/* Single rail with alternating top/bottom half coloring */}
        <div className="sct__rail">
          {railSegs.map((seg, i) => (
            <div
              key={i}
              className={`sct__rail-seg sct__rail-seg--${seg.half}`}
              style={{ left: `${seg.startPct}%`, width: `${seg.endPct - seg.startPct}%` }}
            />
          ))}
        </div>

        {/* Away pips — navy, above the rail */}
        {awayRuns.map((m) => (
          <div
            key={`a${m.idx}`}
            className="sct__run sct__run--away"
            style={{
              left: `${(m.idx / total) * 100}%`,
              height: Math.min(5 + (m.count - 1) * 3, 11),
            }}
          />
        ))}

        {/* Inning ticks + labels — just below the rail, above home pips */}
        {inningTicks.map((h) => (
          <div
            key={h.inning}
            className="sct__inning"
            style={{ left: `${(h.idx / total) * 100}%` }}
          >
            <div className="sct__inning-tick" />
            <span className="sct__inning-num">{h.inning}</span>
          </div>
        ))}

        {/* Home pips — rust, below inning labels */}
        {homeRuns.map((m) => (
          <div
            key={`h${m.idx}`}
            className="sct__run sct__run--home"
            style={{
              left: `${(m.idx / total) * 100}%`,
              height: Math.min(5 + (m.count - 1) * 3, 11),
            }}
          />
        ))}

        {/* Playhead — line with diamond knob at top */}
        {total > 0 && (
          <div className="sct__playhead" style={{ left: `${markerPct}%` }}>
            <div className="sct__playhead-knob" />
          </div>
        )}

      </div>
    </div>
  );
}
