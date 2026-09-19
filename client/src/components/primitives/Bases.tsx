import { useState, type ReactElement } from "react";
import "./Bases.css";

interface BasesProps {
  /** [on1, on2, on3] — first, second, third */
  on: [boolean, boolean, boolean];
  size?: number;
  fill?: string;
  empty?: string;
  strokeWidth?: number;
  /** [first, second, third] — runner display names. Absent = no hover behavior at all. */
  runners?: (string | null)[];
}

const BASE_LABELS = ["1B", "2B", "3B"];

export function Bases({ on, size = 34, fill = "var(--color-text)", empty = "var(--color-border-strong)", strokeWidth = 2, runners }: BasesProps): ReactElement {
  const [on1, on2, on3] = on;
  const s = size / 4.6;
  const [hovered, setHovered] = useState(false);

  const base = (filled: boolean): ReactElement => (
    <div style={{
      width: s,
      height: s,
      background: filled ? fill : "transparent",
      border: `${strokeWidth}px solid ${filled ? fill : empty}`,
      transform: "rotate(45deg)",
    }} />
  );

  // Occupied bases only, in 1st → 2nd → 3rd order — the card answers "who's on",
  // not a three-row table with blanks.
  const occupied: { label: string; name: string }[] = runners != null
    ? [on1, on2, on3]
      .map((isOn, i) => (isOn && runners[i] ? { label: BASE_LABELS[i]!, name: runners[i]! } : null))
      .filter((r): r is { label: string; name: string } => r != null)
    : [];
  const hoverable = occupied.length > 0;

  return (
    <div className="bases" style={{ width: size, height: size }}>
      {/* Second base — top center */}
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)" }}>{base(on2)}</div>
      {/* First base — mid right */}
      <div style={{ position: "absolute", top: "50%", right: 0, transform: "translateY(-50%)" }}>{base(on1)}</div>
      {/* Third base — mid left */}
      <div style={{ position: "absolute", top: "50%", left: 0, transform: "translateY(-50%)" }}>{base(on3)}</div>

      {hoverable && (
        <>
          {/* Padded past the diamond — the three base squares have gaps between them;
              without the pad the pointer falls through the middle and the card flickers. */}
          <div
            className="bases__hit-area"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          />
          {hovered && (
            <div className="bases__hover-card">
              {occupied.map((o) => (
                <div key={o.label} className="bases__hover-row">
                  <span className="bases__hover-label">{o.label}</span>
                  <span className="bases__hover-name">{o.name}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
