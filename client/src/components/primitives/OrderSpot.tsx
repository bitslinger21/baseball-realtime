import type { ReactElement } from "react";

interface OrderSpotProps {
  n: number;
}

export function OrderSpot({ n }: OrderSpotProps): ReactElement {
  const ord = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return (
    <span
      title={`Batting ${n}${ord}`}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 700,
        color: "var(--color-text-muted)",
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1,
        width: 17,
        height: 17,
        borderRadius: 5,
        flexShrink: 0,
        border: "1px solid var(--color-border-strong)",
        background: "var(--color-surface-alt)",
        display: "inline-grid",
        placeItems: "center",
      }}
    >
      {n}
    </span>
  );
}
