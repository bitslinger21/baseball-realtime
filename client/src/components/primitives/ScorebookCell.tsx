import type { ReactElement } from "react";
import "./ScorebookCell.css";

export interface ScorebookCellProps {
  resultCode?: string;
  basesReached?: number;
  scored?: boolean;
  live?: boolean;
  inning?: number;
  width?: number;
}

// Diamond corners in a 40×40 viewBox
const HOME = [20, 38] as const;
const FIRST = [38, 20] as const;
const SECOND = [20, 2] as const;
const THIRD = [2, 20] as const;

const LEGS = [
  [HOME, FIRST],   // basesReached >= 1
  [FIRST, SECOND], // basesReached >= 2
  [SECOND, THIRD], // basesReached >= 3
  [THIRD, HOME],   // basesReached >= 4 (completed circuit)
] as const;

function pathColor(resultCode: string): string {
  const r = resultCode.toUpperCase();
  if (r === "HR" || r === "3B" || r === "2B" || r === "1B") return "var(--color-positive)";
  if (r === "BB" || r === "IBB" || r === "HBP") return "var(--color-info)";
  return "var(--color-border-strong)";
}

function labelColor(resultCode: string): string {
  const c = pathColor(resultCode);
  return c === "var(--color-border-strong)" ? "var(--color-text-faint)" : c;
}

export function ScorebookCell({
  resultCode = "●",
  basesReached = 0,
  scored = false,
  live = false,
  width = 44,
}: ScorebookCellProps): ReactElement {
  const svgH = width;
  const labelH = 14;
  const totalH = svgH + labelH;
  const sw = 1.5;
  const activeLegCount = live ? 0 : Math.min(basesReached, 4);
  const hitColor = pathColor(resultCode);
  const showScore = !live && (scored || basesReached >= 4);

  return (
    <div className="scorebook-cell" style={{ width, height: totalH }}>
      <svg
        width={width}
        height={svgH}
        viewBox="0 0 40 40"
        aria-hidden="true"
        style={{ display: "block" }}
      >
        {/* Diamond outline */}
        <polygon
          points={`${SECOND[0]},${SECOND[1]} ${FIRST[0]},${FIRST[1]} ${HOME[0]},${HOME[1]} ${THIRD[0]},${THIRD[1]}`}
          fill="none"
          stroke={live ? "var(--color-border-strong)" : "var(--color-border)"}
          strokeWidth={sw}
          strokeDasharray={live ? "4 3" : undefined}
          vectorEffect="non-scaling-stroke"
        />

        {/* Reached-base legs drawn over the outline */}
        {!live && LEGS.slice(0, activeLegCount).map(([from, to], i) => (
          <line
            key={i}
            x1={from[0]} y1={from[1]}
            x2={to[0]} y2={to[1]}
            stroke={hitColor}
            strokeWidth={sw + 0.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Scored: filled dot at home plate corner */}
        {showScore && (
          <circle cx={HOME[0]} cy={HOME[1] - 1} r={2.5} fill={hitColor} />
        )}
      </svg>

      {!live && (
        <div
          className="scorebook-cell__label"
          style={{
            fontFamily: "var(--font-mono)",
            color: labelColor(resultCode),
            height: labelH,
          }}
        >
          {resultCode}
        </div>
      )}
    </div>
  );
}
