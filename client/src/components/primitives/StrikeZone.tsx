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

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function StrikeZone({ size = 160, dots = [] }: StrikeZoneProps): ReactElement {
  const height = size * 1.3;
  const dotRadius = 9; // half of 18px dot width

  // Clamp percentages so the dot circle never clips the container edge
  const minX = (dotRadius / size) * 100;
  const maxX = 100 - minX;
  const minY = (dotRadius / height) * 100;
  const maxY = 100 - minY;

  return (
    <div className="strike-zone" style={{ width: size, height }}>
      <div className="strike-zone__box" />
      {/* Perspective home plate — SVG pentagon, full zone width */}
      <svg
        className="strike-zone__plate-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polygon
          points="2,0 98,0 100,58 50,100 0,58"
          fill="var(--color-surface-alt)"
          stroke="var(--color-border-strong)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {dots.map((d, i) => (
        <div
          key={i}
          className="strike-zone__dot"
          style={{
            left: `${clamp(d.x, minX, maxX)}%`,
            top: `${clamp(d.y, minY, maxY)}%`,
            background: d.color,
          }}
        >
          {d.label}
        </div>
      ))}
    </div>
  );
}
