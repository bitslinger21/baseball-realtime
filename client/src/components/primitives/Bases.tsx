import type { ReactElement } from "react";
import "./Bases.css";

interface BasesProps {
  /** [on1, on2, on3] — first, second, third */
  on: [boolean, boolean, boolean];
  size?: number;
  fill?: string;
  empty?: string;
}

export function Bases({ on, size = 34, fill, empty }: BasesProps): ReactElement {
  const [on1, on2, on3] = on;
  const diamond = size * 0.42;
  const gap = size * 0.08;
  // Lay out as a rotated diamond: second on top, first right, third left
  return (
    <div className="bases" style={{ width: size, height: size * 0.75 }}>
      {/* Second base (top center) */}
      <span
        className={`bases__base${on2 ? " bases__base--on" : ""}`}
        style={{
          width: diamond,
          height: diamond,
          top: 0,
          left: "50%",
          transform: "translateX(-50%) rotate(45deg)",
          background: on2 ? (fill ?? undefined) : (empty ?? undefined),
        }}
      />
      {/* Third base (mid left) */}
      <span
        className={`bases__base${on3 ? " bases__base--on" : ""}`}
        style={{
          width: diamond,
          height: diamond,
          top: diamond / 2 + gap,
          left: `calc(50% - ${diamond + gap}px)`,
          transform: "rotate(45deg)",
          background: on3 ? (fill ?? undefined) : (empty ?? undefined),
        }}
      />
      {/* First base (mid right) */}
      <span
        className={`bases__base${on1 ? " bases__base--on" : ""}`}
        style={{
          width: diamond,
          height: diamond,
          top: diamond / 2 + gap,
          left: `calc(50% + ${gap}px)`,
          transform: "rotate(45deg)",
          background: on1 ? (fill ?? undefined) : (empty ?? undefined),
        }}
      />
    </div>
  );
}
