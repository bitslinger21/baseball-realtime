import type { ReactElement } from "react";
import { StepTip } from "./StepTip";
import "./ScoutTransport.css";

// The Scout play controls — ONE component, rendered in both the pitch-by-pitch
// header and the scorecard header (PROMPT_scorecard_header.md §1), so the two
// are identical by construction:
//   [half-inning ▾] [speed ▾] │ [◀◀] bat [▶▶] │ [|◀] ball [▶|] │ [▶ Play]

export interface ScoutTransportControls {
  playing: boolean;
  onToggle: () => void;
  onStep: (dir: -1 | 1) => void;
  onStepBatter: (dir: -1 | 1) => void;
  markerMoment: number;
  totalMoments: number;
  inningOptions: { label: string; headIdx: number; key: string }[];
  onSeekInning: (headIdx: number) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

// Step icons as inline SVG in ink (Unicode media glyphs render as emoji tiles
// on some platforms). Two shapes so the groups read differently: at-bat =
// double triangle (a bigger jump), pitch = triangle + bar (one step).
function StepIcon({ kind, dir }: { kind: "ab" | "pitch"; dir: -1 | 1 }): ReactElement {
  const tri = (x: number): ReactElement => <path d={`M${x} 2 L${x + 5} 6 L${x} 10 Z`} fill="currentColor" />;
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style={{ display: "block", transform: dir < 0 ? "scaleX(-1)" : "none" }}>
      {kind === "ab"
        ? <>{tri(1)}{tri(6)}</>
        : <>{tri(2.5)}<rect x="8.5" y="2" width="1.6" height="8" fill="currentColor" /></>}
    </svg>
  );
}

function StepButton({ label, onClick, disabled, kind, dir }: {
  label: string; onClick: () => void; disabled: boolean; kind: "ab" | "pitch"; dir: -1 | 1;
}): ReactElement {
  return (
    <StepTip label={label}>
      <button type="button" className="st__step" onClick={onClick} aria-label={label} disabled={disabled}>
        <StepIcon kind={kind} dir={dir} />
      </button>
    </StepTip>
  );
}

export function ScoutTransport({ c }: { c: ScoutTransportControls }): ReactElement {
  const atStart = c.markerMoment <= 0;
  const atEnd = c.markerMoment >= c.totalMoments;
  const inningValue =
    [...c.inningOptions].reverse().find((o) => o.headIdx <= c.markerMoment)?.headIdx ?? c.inningOptions[0]?.headIdx ?? 1;
  return (
    <div className="st">
      <select className="st__chip" value={inningValue} onChange={(e) => c.onSeekInning(Number(e.target.value))} title="Jump to half-inning">
        {c.inningOptions.map((o) => <option key={o.key} value={o.headIdx}>{o.label}</option>)}
      </select>
      <select className="st__chip" value={c.speed} onChange={(e) => c.onSpeedChange(Number(e.target.value))} title="Playback speed">
        {[0.5, 1, 2, 4].map((s) => <option key={s} value={s}>{s}×</option>)}
      </select>
      <span className="st__sep" />
      <div className="st__group">
        <StepButton label="Previous batter" onClick={() => c.onStepBatter(-1)} disabled={atStart} kind="ab" dir={-1} />
        <img className="st__glyph" src="/baseball-bat.svg" width="20" height="20" alt="" />
        <StepButton label="Next batter" onClick={() => c.onStepBatter(1)} disabled={atEnd} kind="ab" dir={1} />
      </div>
      <span className="st__sep" />
      <div className="st__group">
        <StepButton label="Previous pitch" onClick={() => c.onStep(-1)} disabled={atStart} kind="pitch" dir={-1} />
        <img className="st__glyph" src="/baseball.svg" width="20" height="20" alt="" />
        <StepButton label="Next pitch" onClick={() => c.onStep(1)} disabled={atEnd} kind="pitch" dir={1} />
      </div>
      <span className="st__sep" />
      <button
        type="button"
        className={`st__btn st__play${c.playing ? " st__play--playing" : ""}`}
        onClick={c.onToggle}
        aria-label={c.playing ? "Review" : "Play"}
      >
        <span className="st__play-icon" aria-hidden="true">{c.playing ? "⏸︎" : "▶︎"}</span>
        {c.playing ? "Review" : "Play"}
      </button>
    </div>
  );
}
