import type { ReactElement } from "react";
import "./StrikeZone.css";

export interface StrikeZoneDot {
  x: number;
  y: number;
  label: string | number;
  color: string;
}

interface StrikeZoneProps {
  size?: number;
  dots?: StrikeZoneDot[];
}

export function StrikeZone({ size = 160, dots = [] }: StrikeZoneProps): ReactElement {
  return (
    <div className="strike-zone" style={{ width: size, height: size * 1.1 }}>
      <div className="strike-zone__box" />
      <div className="strike-zone__plate" />
      {dots.map((d, i) => (
        <div
          key={i}
          className="strike-zone__dot"
          style={{ left: `${d.x}%`, top: `${d.y}%`, background: d.color }}
        >
          {d.label}
        </div>
      ))}
    </div>
  );
}
