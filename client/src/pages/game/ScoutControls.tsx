import type { ReactElement } from "react";
import "./ScoutControls.css";

interface ScoutControlsProps {
  playing: boolean;
  onToggle: () => void;
  onStep: (dir: -1 | 1) => void;
  headMoment: number;
  totalMoments: number;
  contextLabel: string | null;
}

export function ScoutControls({
  playing,
  onToggle,
  onStep,
  headMoment,
  totalMoments,
  contextLabel,
}: ScoutControlsProps): ReactElement {
  return (
    <div className="scout-controls">
      <div className="scout-controls__bar">
        <button
          type="button"
          className="scout-controls__step-btn"
          onClick={() => onStep(-1)}
          aria-label="Previous at-bat"
          disabled={headMoment <= 1}
        >
          ⏮
        </button>
        <button
          type="button"
          className="scout-controls__play-btn"
          onClick={onToggle}
        >
          <span className="scout-controls__icon">{playing ? "⏸" : "▶"}</span>
          <span className="scout-controls__mode">{playing ? "Review" : "Play"}</span>
        </button>
        <button
          type="button"
          className="scout-controls__step-btn"
          onClick={() => onStep(1)}
          aria-label="Next at-bat"
          disabled={headMoment >= totalMoments}
        >
          ⏭
        </button>
      </div>
      {contextLabel != null && (
        <div className="scout-controls__context">{contextLabel}</div>
      )}
      <div className="scout-controls__progress">
        <span className="num scout-controls__progress-text">
          {headMoment} / {totalMoments}
        </span>
      </div>
    </div>
  );
}
