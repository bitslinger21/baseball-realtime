import type { ReactElement } from "react";

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
  const h = size * 1.3;
  const dotSize = Math.max(16, size * 0.075);
  // Clamp so a dot's full circle always stays inside the frame (no clipping).
  const padX = (dotSize / 2 / size) * 100 + 1;
  const padY = (dotSize / 2 / h) * 100 + 1;
  function clamp(v: number, p: number): number { return Math.max(p, Math.min(100 - p, v)); }

  return (
    <div style={{
      width: size, height: h,
      position: "relative",
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-sm)",
      overflow: "hidden",
      flexShrink: 0,
    }}>
      {/* Batter's-box chalk lines (splayed for linear perspective) + home plate.
          viewBox y-range 0–130 keeps units square against the 1:1.3 frame. */}
      <svg viewBox="0 0 100 130" preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}>
        {/* batter's box: inner chalk lines, converging toward the distance (top) */}
        <line x1="17" y1="92" x2="3"  y2="129" stroke="var(--color-border)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        <line x1="83" y1="92" x2="97" y2="129" stroke="var(--color-border)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        {/* home plate — side edges converge to the same vanishing point as the batter's-box lines */}
        <polygon points="26.4,98 73.6,98 76,107 50,119 24,107"
          fill="var(--color-surface-alt)" stroke="var(--color-border-strong)" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* Strike zone box — realistic tall rectangle (~0.77:1) with 3×3 grid */}
      <div style={{
        position: "absolute", inset: "12% 23% 34% 23%",
        border: "2px solid var(--color-ink)",
        backgroundImage: "linear-gradient(var(--color-border-strong) 1px, transparent 1px), linear-gradient(90deg, var(--color-border-strong) 1px, transparent 1px)",
        backgroundSize: "33.33% 33.33%",
        zIndex: 1,
      }} />

      {dots.map((d, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${clamp(d.x, padX)}%`, top: `${clamp(d.y, padY)}%`,
          width: dotSize, height: dotSize, borderRadius: "50%",
          background: d.color, color: "#fff",
          display: "grid", placeItems: "center",
          fontFamily: "var(--font-mono)", fontSize: dotSize * 0.55, fontWeight: 700,
          transform: "translate(-50%, -50%)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
          zIndex: 2,
        }}>{d.label}</div>
      ))}
    </div>
  );
}
