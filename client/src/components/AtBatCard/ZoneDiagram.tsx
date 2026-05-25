import React from "react";
import type { PitchEntry } from "./atBatTypes";
import "./ZoneDiagram.css";

const DOT_RED = "rgba(229, 62, 62, 0.7)";
const DOT_GREEN = "rgba(72, 187, 120, 0.7)";
const DOT_YELLOW = "rgba(236, 201, 75, 0.7)";

function getDotColor(result: string, strikesBeforePitch: number): string {
  const r = result.toLowerCase();
  if (r.includes("ball")) return DOT_GREEN;
  if (r.includes("foul tip")) return DOT_RED;
  if (r.includes("foul")) return strikesBeforePitch >= 2 ? DOT_YELLOW : DOT_RED;
  if (r.includes("strike")) return DOT_RED;
  return DOT_RED;
}

interface ZoneDiagramProps {
  pitches: PitchEntry[];
  strikeZoneTop?: number;
  strikeZoneBottom?: number;
  width?: number;
  height?: number;
}

const PADDING_PX = 14;
const PX_MIN = -1.5;
const PX_MAX = 1.5;

export function ZoneDiagram({
  pitches,
  strikeZoneTop,
  strikeZoneBottom,
  width = 200,
  height = 220,
}: ZoneDiagramProps): React.ReactElement {
  const szTop = strikeZoneTop ?? 3.5;
  const szBottom = strikeZoneBottom ?? 1.5;

  const plotWidth = width - 2 * PADDING_PX;
  const plotHeight = height - 2 * PADDING_PX;

  function toSvgX(pX: number): number {
    const norm = (pX - PX_MIN) / (PX_MAX - PX_MIN);
    return PADDING_PX + norm * plotWidth;
  }

  function toSvgY(pZ: number): number {
    const clamped = Math.max(0, pZ);
    const yMin = szBottom - 0.5;
    const yMax = szTop + 0.5;
    const norm = (clamped - yMin) / (yMax - yMin);
    return PADDING_PX + (1 - norm) * plotHeight;
  }

  const zoneLeft = toSvgX(-0.835);
  const zoneRight = toSvgX(0.835);
  const zoneTop = toSvgY(szTop);
  const zoneBottom = toSvgY(szBottom);

  const h1 = toSvgY(szBottom + (szTop - szBottom) / 3);
  const h2 = toSvgY(szBottom + ((szTop - szBottom) * 2) / 3);
  const v1 = toSvgX(-0.835 + 1.67 / 3);
  const v2 = toSvgX(-0.835 + (1.67 * 2) / 3);

  const plateCx = toSvgX(0);
  const plateY = height - PADDING_PX + 4;
  const plateW = 12;
  const plateH = 8;

  return (
    <svg
      className="zone-diagram"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
    >
      {/* Background */}
      <rect x={0} y={0} width={width} height={height} fill="#f7fafc" rx={4} />

      {/* Strike zone */}
      <rect
        x={zoneLeft}
        y={zoneTop}
        width={zoneRight - zoneLeft}
        height={zoneBottom - zoneTop}
        fill="none"
        stroke="#718096"
        strokeWidth={1.5}
      />

      {/* 3x3 grid lines */}
      <line x1={v1} y1={zoneTop} x2={v1} y2={zoneBottom} stroke="#cbd5e0" strokeWidth={0.75} />
      <line x1={v2} y1={zoneTop} x2={v2} y2={zoneBottom} stroke="#cbd5e0" strokeWidth={0.75} />
      <line x1={zoneLeft} y1={h1} x2={zoneRight} y2={h1} stroke="#cbd5e0" strokeWidth={0.75} />
      <line x1={zoneLeft} y1={h2} x2={zoneRight} y2={h2} stroke="#cbd5e0" strokeWidth={0.75} />

      {/* Home plate */}
      <polygon
        points={`${plateCx},${plateY + plateH} ${plateCx - plateW / 2},${plateY + plateH / 2} ${plateCx - plateW / 2},${plateY} ${plateCx + plateW / 2},${plateY} ${plateCx + plateW / 2},${plateY + plateH / 2}`}
        fill="#e2e8f0"
        stroke="#a0aec0"
        strokeWidth={1}
      />

      {/* Pitch dots */}
      {pitches
        .filter((p) => p.pitchX != null && p.pitchZ != null)
        .map((p) => {
          const strikesBeforePitch =
            p.seq > 1
              ? parseInt((pitches[p.seq - 2]?.count ?? "0-0").split("-")[1], 10) || 0
              : 0;
          const dotColor = getDotColor(p.result, strikesBeforePitch);
          return (
          <g key={p.seq}>
            <circle
              cx={toSvgX(p.pitchX!)}
              cy={toSvgY(p.pitchZ!)}
              r={9}
              fill={dotColor}
              stroke="white"
              strokeWidth={1}
            />
            <text
              x={toSvgX(p.pitchX!)}
              y={toSvgY(p.pitchZ!) + 4}
              textAnchor="middle"
              fontSize={9}
              fill="white"
              fontWeight="bold"
            >
              {p.seq}
            </text>
          </g>
          );
        })}
    </svg>
  );
}
