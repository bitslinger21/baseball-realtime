import type { ReactElement } from "react";
import "./EdgeButton.css";

interface EdgeButtonProps {
  edge: "top" | "bottom" | "left" | "right";
  onClick: () => void;
  ariaLabel: string;
  ground?: string;
}

// One shared edge affordance, app-wide (PROMPT_home_page.md §6.6) — there
// were three different hand-rolled versions of "there is more this way,
// press here" (a live widget's slide arrows, Leaders' scroll chevrons,
// Following's face cycler); this is the one atom all of them render through.
// A SOLID strip, not a gradient — a gradient reads as a fade that happens to
// be clickable. Hidden at rest; the caller reveals it by wrapping the button
// and its container in a shared hover group (see `.edge-hover` in the
// consuming CSS) rather than tracking hover state in JS.
export function EdgeButton({ edge, onClick, ariaLabel, ground }: EdgeButtonProps): ReactElement {
  const rotation = { top: 180, bottom: 0, left: 90, right: -90 }[edge];
  return (
    <button
      type="button"
      className={`edge-btn edge-btn--${edge}`}
      style={ground != null ? { background: ground } : undefined}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <svg width="14" height="9" viewBox="0 0 14 9" fill="none" style={{ transform: `rotate(${rotation}deg)` }}>
        <polyline points="1,1 7,7 13,1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
