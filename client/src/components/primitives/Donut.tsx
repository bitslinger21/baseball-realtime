import type { ReactElement } from 'react';

interface DonutSegment {
  value: number;
  color: string;
}

interface DonutProps {
  data: DonutSegment[];
  total: number;
  size?: number;
  thickness?: number;
}

export function Donut({ data, total, size = 160, thickness = 22 }: DonutProps): ReactElement {
  const sum = data.reduce((s, d) => s + d.value, 0);
  const r = size / 2;
  const cr = r - thickness / 2;
  let angle = -Math.PI / 2;

  const segs = data.map((d) => {
    const a0 = angle;
    const a1 = angle + (d.value / sum) * Math.PI * 2;
    angle = a1;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = r + cr * Math.cos(a0);
    const y0 = r + cr * Math.sin(a0);
    const x1 = r + cr * Math.cos(a1);
    const y1 = r + cr * Math.sin(a1);
    return { x0, y0, x1, y1, large, color: d.color };
  });

  return (
    <svg width={size} height={size} aria-hidden="true" style={{ flexShrink: 0 }}>
      {segs.map((s, i) => (
        <path
          key={i}
          d={`M ${s.x0.toFixed(2)} ${s.y0.toFixed(2)} A ${cr} ${cr} 0 ${s.large} 1 ${s.x1.toFixed(2)} ${s.y1.toFixed(2)}`}
          fill="none"
          stroke={s.color}
          strokeWidth={thickness}
          strokeLinecap="butt"
        />
      ))}
      <circle cx={r} cy={r} r={cr - thickness / 2 - 2} fill="var(--color-surface)" />
      <text
        x={r} y={r - 2}
        textAnchor="middle"
        fontFamily="var(--font-sans)"
        fontSize="10"
        fontWeight="700"
        letterSpacing="0.1em"
        fill="var(--color-text-muted)"
      >
        SEEN
      </text>
      <text
        x={r} y={r + 18}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="22"
        fontWeight="700"
        fill="var(--color-text)"
      >
        {total}
      </text>
    </svg>
  );
}
