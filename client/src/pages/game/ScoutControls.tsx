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
          className={`scout-controls__play-btn${playing ? " scout-controls__play-btn--playing" : ""}`}
          onClick={onToggle}
        >
          <span className="scout-controls__play-icon">{playing ? "⏸" : "▶"}</span>
          <span className="scout-controls__play-label">{playing ? "Review" : "Play"}</span>
        </button>

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
          className="scout-controls__step-btn"
          onClick={() => onStep(1)}
          aria-label="Next at-bat"
          disabled={headMoment >= totalMoments}
        >
          ⏭
        </button>

        <div className="scout-controls__info">
          {contextLabel != null && (
            <span className="scout-controls__info-context num">{contextLabel}</span>
          )}
          <span className="scout-controls__info-progress num">
            {headMoment} / {totalMoments}
          </span>
        </div>
      </div>

    </div>
  );
}
