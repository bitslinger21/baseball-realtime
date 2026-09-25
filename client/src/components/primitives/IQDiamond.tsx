import type { ReactElement } from "react";
import "./IQDiamond.css";

interface IQDiamondProps {
  size?: number;
  color?: string;
  pulse?: boolean;
  tail?: boolean;
}

// One component, two marks, keyed off colour (PROMPT_iq_global.md §3):
// - Rust (the default) = Baseball IQ: an open home-plate outline at the
//   diamond's bottom tip, plus a tail breaking right from it — a Q without a
//   diagonal.
// - Any other colour = the brand mark, matching the wordmark PNG: a small
//   rotated square nested in the bottom corner instead of a home plate, and
//   never a tail. Used wherever "SCOREBOOK" appears as a brand mark (e.g.
//   the scorecard-mode lockup) rather than an ask affordance — rust + a tail
//   means "Baseball IQ here" app-wide, so this mark must never be mistaken
//   for that. `tail` overrides the tail explicitly when a caller needs to,
//   but should never have to.
export function IQDiamond({ size = 18, color = "var(--color-accent)", pulse = false, tail }: IQDiamondProps): ReactElement {
  const isIq = color === "var(--color-accent)";
  const showTail = tail ?? isIq;
  const svg = (
    <svg width={size} height={size} viewBox="0 0 24 24" overflow="visible" aria-hidden="true" style={{ display: "block" }}>
      <path d="M12 2 L22 12 L12 22 L2 12 Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {isIq ? (
        <path d="M9.8 15.8 L14.2 15.8 L14.2 18 L12 20.2 L9.8 18 Z" fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="miter" />
      ) : (
        <path d="M12 16.4 L14.3 18.7 L12 21 L9.7 18.7 Z" fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
      )}
      {showTail && <path d="M12 22 H22.5" stroke={color} strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
  if (!pulse) return svg;
  return (
    <span className="iq-diamond iq-diamond--pulse" style={{ width: size, height: size }}>
      {svg}
    </span>
  );
}
