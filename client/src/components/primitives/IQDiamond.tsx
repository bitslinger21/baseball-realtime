import type { ReactElement } from "react";
import "./IQDiamond.css";

interface IQDiamondProps {
  size?: number;
  color?: string;
  pulse?: boolean;
  tail?: boolean;
}

// The brand glyph — a diamond with a true home plate (point down) at its
// bottom tip, and a tail breaking right from that tip: a Q without a
// diagonal. RULE (Sep 23, 2026): the tail follows the colour — rust (the
// default) means "Baseball IQ has context here" and gets the tail; any
// other colour (e.g. the ink brand mark in the scorecard header) drops it,
// so it never reads as a second live-context glyph. `tail` overrides
// explicitly when a caller needs to, but should never have to.
export function IQDiamond({ size = 18, color = "var(--color-accent)", pulse = false, tail }: IQDiamondProps): ReactElement {
  const showTail = tail ?? color === "var(--color-accent)";
  const svg = (
    <svg width={size} height={size} viewBox="0 0 24 24" overflow="visible" aria-hidden="true" style={{ display: "block" }}>
      <path d="M12 2 L22 12 L12 22 L2 12 Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M9.8 15.8 L14.2 15.8 L14.2 18 L12 20.2 L9.8 18 Z" fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="miter" />
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
