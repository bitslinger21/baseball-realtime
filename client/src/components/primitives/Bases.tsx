import type { ReactElement } from "react";
import "./Bases.css";

interface BasesProps {
  /** [on1, on2, on3] — first, second, third */
  on: [boolean, boolean, boolean];
  size?: number;
  fill?: string;
  empty?: string;
  strokeWidth?: number;
}

export function Bases({ on, size = 34, fill = "var(--color-text)", empty = "var(--color-border-strong)", strokeWidth = 2 }: BasesProps): ReactElement {
  const [on1, on2, on3] = on;
  const s = size / 4.6;

  const base = (filled: boolean): ReactElement => (
    <div style={{
      width: s,
      height: s,
      background: filled ? fill : "transparent",
      border: `${strokeWidth}px solid ${filled ? fill : empty}`,
      transform: "rotate(45deg)",
    }} />
  );

  return (
    <div className="bases" style={{ width: size, height: size }}>
      {/* Second base — top center */}
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)" }}>{base(on2)}</div>
      {/* First base — mid right */}
      <div style={{ position: "absolute", top: "50%", right: 0, transform: "translateY(-50%)" }}>{base(on1)}</div>
      {/* Third base — mid left */}
      <div style={{ position: "absolute", top: "50%", left: 0, transform: "translateY(-50%)" }}>{base(on3)}</div>
    </div>
  );
}
