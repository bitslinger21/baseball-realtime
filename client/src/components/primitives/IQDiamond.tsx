import type { ReactElement } from "react";
import "./IQDiamond.css";

interface IQDiamondProps {
  size?: number;
  color?: string;
  pulse?: boolean;
}

// The brand glyph: a plain outlined diamond with the home-plate square at the
// BOTTOM point only (no squares at the other three corners). Home plate is
// OUTLINED, not filled — a solid block reads as a weight/bug at bullet size.
// One glyph, one meaning ("Baseball IQ has context for this"), one
// definition — shared by the dark-band panel and Home's What's Hot bullets.
export function IQDiamond({ size = 18, color = "var(--color-accent)", pulse = false }: IQDiamondProps): ReactElement {
  const svg = (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      <path d="M12 2 L22 12 L12 22 L2 12 Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <rect x="9" y="16.2" width="6" height="4.2" fill="none" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
  if (!pulse) return svg;
  return (
    <span className="iq-diamond iq-diamond--pulse" style={{ width: size, height: size }}>
      {svg}
    </span>
  );
}
