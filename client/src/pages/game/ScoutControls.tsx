import type { ReactElement } from "react";
import "./ScoutControls.css";

const BatIcon = (): ReactElement => (
  <img src="/baseball-bat.svg" width="20" height="20" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }} alt="" />
);

const BallIcon = (): ReactElement => (
  <img src="/baseball.svg" width="20" height="20" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }} alt="" />
);

export interface InningOption {
  label: string;
  headIdx: number;
  key: string;
}

interface ScoutControlsProps {
  playing: boolean;
  onToggle: () => void;
  onStep: (dir: -1 | 1) => void;
  onStepBatter: (dir: -1 | 1) => void;
  markerMoment: number;
  totalMoments: number;
  contextLabel: string | null;
  inningOptions: InningOption[];
  onSeekInning: (headIdx: number) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export function ScoutControls({
  playing,
  onToggle,
  onStep,
  onStepBatter,
  markerMoment,
  totalMoments,
  contextLabel,
  inningOptions,
  onSeekInning,
  speed,
  onSpeedChange,
}: ScoutControlsProps): ReactElement {
  const currentInnHead =
    [...inningOptions].reverse().find(o => o.headIdx <= markerMoment)?.headIdx ??
    inningOptions[0]?.headIdx ??
    1;

  return (
    <div className="scout-controls">
      <div className="scout-controls__bar">
        {contextLabel != null && (
          <span className="scout-controls__context">{contextLabel}</span>
        )}

        <div className="scout-controls__right">
          <select
            className="scout-controls__select scout-controls__select--inning"
            value={currentInnHead}
            onChange={e => onSeekInning(Number(e.target.value))}
            title="Jump to inning"
          >
            {inningOptions.map(o => (
              <option key={o.key} value={o.headIdx}>{o.label}</option>
            ))}
          </select>

          <select
            className="scout-controls__select scout-controls__select--speed"
            value={speed}
            onChange={e => onSpeedChange(Number(e.target.value))}
            title="Playback speed"
          >
            {[0.5, 1, 2, 4].map(s => (
              <option key={s} value={s}>{s}×</option>
            ))}
          </select>

          <div className="scout-controls__sep" />

          <button
            type="button"
            className={`scout-controls__play-btn${playing ? " scout-controls__play-btn--playing" : ""}`}
            onClick={onToggle}
            aria-label={playing ? "Review" : "Play"}
          >
            <span className="scout-controls__play-icon">{playing ? "⏸" : "▶"}</span>
            <span className="scout-controls__play-label">{playing ? "Review" : "Play"}</span>
          </button>

          <div className="scout-controls__sep" />

          <button
            type="button"
            className="scout-controls__step-btn"
            onClick={() => onStepBatter(-1)}
            aria-label="Previous batter"
            disabled={markerMoment <= 1}
          >
            ⏪
          </button>
          <span className="scout-controls__step-label"><BatIcon /></span>
          <button
            type="button"
            className="scout-controls__step-btn"
            onClick={() => onStepBatter(1)}
            aria-label="Next batter"
            disabled={markerMoment >= totalMoments}
          >
            ⏩
          </button>

          <div className="scout-controls__sep" />

          <button
            type="button"
            className="scout-controls__step-btn"
            onClick={() => onStep(-1)}
            aria-label="Previous pitch"
            disabled={markerMoment <= 1}
          >
            ⏮
          </button>
          <span className="scout-controls__step-label"><BallIcon /></span>
          <button
            type="button"
            className="scout-controls__step-btn"
            onClick={() => onStep(1)}
            aria-label="Next pitch"
            disabled={markerMoment >= totalMoments}
          >
            ⏭
          </button>

          <span className="scout-controls__counter num">
            {markerMoment} / {totalMoments}
          </span>
        </div>
      </div>
    </div>
  );
}
