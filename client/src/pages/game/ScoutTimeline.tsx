import type { ReactElement } from "react";
import { useRef, useCallback } from "react";
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
  // Tucked beneath the scorecard header's control row, sharing its column
  // width rather than sitting as its own full-width strip — tighter padding,
  // and no inning numbers (the scorecard right below labels the innings).
  compact?: boolean;
}

// The whole game as one rail (PROMPT_timeline_fixes.md; design GameTimeline).
// Half-inning segments are as wide as their pitch counts, so a long inning
// reads wider than a quick one. Top to bottom: away run lane, the 8px rail,
// home run lane, inning numbers — the home lane belongs to the rail, so
// nothing sits between them. Each lane is labelled with its team's logo in
// the left column, which lines up with the lanes. The marker is gold, so it
// can never be read as a run.
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

  const seekFromPointer = useCallback((e: React.PointerEvent) => {
    const el = trackRef.current;
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

  const pct = (idx: number): number => (total > 0 ? (idx / total) * 100 : 0);

  // Half-inning segments, each as wide as its pitch count.
  const segments = halfInnings.map((h, i) => ({
    key: `${h.inning}-${h.half}`,
    half: h.half,
    inning: h.inning,
    count: Math.max(1, (i + 1 < halfInnings.length ? halfInnings[i + 1].idx : total) - h.idx),
  }));
  // Inning numbers, centred under each inning's two halves.
  const innings: { inning: number; count: number }[] = [];
  for (const s of segments) {
    const cur = innings[innings.length - 1];
    if (cur != null && cur.inning === s.inning) cur.count += s.count;
    else innings.push({ inning: s.inning, count: s.count });
  }

  const lane = (team: "away" | "home"): ReactElement => (
    <div className={`sct__lane sct__lane--${team}`}>
      {runMarkers.filter((m) => m.team === team).map((m) => (
        <span
          key={m.idx}
          className={`sct__run sct__run--${team}${m.count > 1 ? " sct__run--multi" : ""}`}
          style={{ left: `${pct(m.idx)}%` }}
          title={`${m.count} run${m.count === 1 ? "" : "s"}${m.label != null ? ` · ${m.label}` : ""}`}
        />
      ))}
    </div>
  );

  const away = TEAMS[awayAbbr];
  const home = TEAMS[homeAbbr];

  return (
    <div className={`sct${compact ? " sct--compact" : ""}`}>
      {/* Lane labels: 11 + 8 + 11, level with the lanes and the rail. */}
      <div className="sct__labels" aria-hidden="true">
        <span className="sct__label">{away != null && <TeamDot team={away} size={13} />}</span>
        <span className="sct__label-gap" />
        <span className="sct__label">{home != null && <TeamDot team={home} size={13} />}</span>
      </div>
      <div
        className="sct__track"
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
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
          {total > 0 && (
            <>
              <span className="sct__marker" style={{ left: `${pct(markerIdx)}%` }} />
              <span className="sct__marker-dot" style={{ left: `${pct(markerIdx)}%` }} />
            </>
          )}
        </div>
        {lane("home")}
        {!compact && (
          <div className="sct__innings">
            {innings.map((b) => (
              <div key={b.inning} className="sct__inning-num" style={{ flex: b.count }}>{b.inning}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
