import type { ReactElement } from "react";

interface FlipIconProps {
  size?: number;
}

// A plain "flip this card" affordance. Previously a diamond glyph reused as a
// generic icon (scorecard flip, wins-chart flip) — but the diamond is now
// reserved app-wide for two specific meanings (Baseball IQ availability in
// rust, the brand lockup in ink), so a third, unrelated use collided with
// that rule. Inherits `currentColor` so it matches its own button, never a
// hardcoded color.
export function FlipIcon({ size = 14 }: FlipIconProps): ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 4v6h-6M3 20v-6h6M3.51 10a9 9 0 0 1 14.85-3.36L21 10M20.49 14a9 9 0 0 1-14.85 3.36L3 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
