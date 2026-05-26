import type { ReactElement } from "react";
import "./Pips.css";

interface PipsProps {
  count: number;
  total: number;
  size?: number;
  gap?: number;
  color?: string;
  emptyColor?: string;
}

export function Pips({ count, total, size = 7, gap = 3, color, emptyColor }: PipsProps): ReactElement {
  const filled = Math.max(0, Math.min(count, total));
  return (
    <div className="pips" style={{ gap }}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`pips__dot${i < filled ? " pips__dot--on" : ""}`}
          style={{
            width: size,
            height: size,
            background: i < filled ? (color ?? undefined) : (emptyColor ?? undefined),
          }}
        />
      ))}
    </div>
  );
}
