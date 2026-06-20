import type { ReactElement } from "react";
import { Card } from "../../components/primitives/Card";
import "./WinProbTimeline.css";

export interface WinProbPoint {
  /** 0..1 progress through the game (atBatIndex / totalAtBats) */
  t: number;
  /** Home team win probability 0–100 */
  pct: number;
}

interface WinProbTimelineProps {
  pts: WinProbPoint[];
  homeAbbr: string;
  awayAbbr: string;
  homePrimary: string;
  awayPrimary: string;
}

const W = 620, H = 156;
const PAD = { l: 8, r: 44, t: 20, b: 24 };
const iw = W - PAD.l - PAD.r;
const ih = H - PAD.t - PAD.b;
const X = (t: number) => PAD.l + t * iw;
const Y = (p: number) => PAD.t + (1 - p / 100) * ih;
const INNINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function WinProbTimeline({
  pts,
  homeAbbr,
  awayAbbr,
  homePrimary,
  awayPrimary,
}: WinProbTimelineProps): ReactElement | null {
  if (pts.length === 0) return null;

  const midY = Y(50);
  const line = pts
    .map((d, i) => `${i === 0 ? "M" : "L"}${X(d.t).toFixed(1)} ${Y(d.pct).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${X(1).toFixed(1)} ${midY.toFixed(1)} L${X(0).toFixed(1)} ${midY.toFixed(1)} Z`;
  const last = pts[pts.length - 1];

  const isHomeLeading = last.pct >= 50;
  const leaderPct = isHomeLeading ? last.pct : 100 - last.pct;
  const leaderAbbr = isHomeLeading ? homeAbbr : awayAbbr;
  const leaderColor = isHomeLeading ? homePrimary : awayPrimary;

  return (
    <Card padless>
      <div className="wpt__header">
        <span className="wpt__eyebrow">Win probability</span>
        <div className="wpt__leader">
          <span className="wpt__leader-pct">{leaderPct.toFixed(0)}%</span>
          <span className="wpt__leader-abbr" style={{ color: leaderColor }}>{leaderAbbr}</span>
        </div>
      </div>

      <div className="wpt__chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="wpt__svg">
          <defs>
            <clipPath id="wpt-above">
              <rect x="0" y="0" width={W} height={midY} />
            </clipPath>
            <clipPath id="wpt-below">
              <rect x="0" y={midY} width={W} height={H - midY} />
            </clipPath>
          </defs>

          {/* Grid lines */}
          {[100, 50, 0].map((v) => (
            <g key={v}>
              <line
                x1={PAD.l} y1={Y(v)} x2={W - PAD.r} y2={Y(v)}
                stroke={v === 50 ? "var(--color-border-strong)" : "var(--color-border)"}
                strokeWidth="1"
                strokeDasharray={v === 50 ? "4 4" : "0"}
              />
              <text x={W - PAD.r + 7} y={Y(v) + 4} fontFamily="var(--font-mono)" fontSize="11" fill="var(--color-text-faint)">{v}</text>
            </g>
          ))}

          {/* Team anchors on axis */}
          <text x={W - PAD.r + 7} y={11} fontFamily="var(--font-sans)" fontSize="10" fontWeight="700" fill={homePrimary}>{homeAbbr}</text>
          <text x={W - PAD.r + 7} y={H - 3} fontFamily="var(--font-sans)" fontSize="10" fontWeight="700" fill={awayPrimary}>{awayAbbr}</text>

          {/* Filled area split by 50% line */}
          <path d={area} fill="var(--color-accent-soft)" clipPath="url(#wpt-above)" />
          <path d={area} fill="var(--color-info-soft)" clipPath="url(#wpt-below)" />

          {/* Main line */}
          <path d={line} fill="none" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

          {/* Current position dot */}
          <circle cx={X(last.t)} cy={Y(last.pct)} r="5" fill="var(--color-accent)" stroke="#fff" strokeWidth="2" />

          {/* Inning labels */}
          {INNINGS.map((n) => (
            <text
              key={n}
              x={X(n / 9)}
              y={H - 5}
              fontFamily="var(--font-mono)"
              fontSize="10"
              fill="var(--color-text-faint)"
              textAnchor="middle"
            >
              {n}
            </text>
          ))}
        </svg>
      </div>

      <div className="wpt__howto">
        <span className="wpt__howto-label">How to read:</span>{" "}
        the line shows which team is favored to win after each play. It starts even at 50% and rises
        toward <span style={{ color: homePrimary, fontWeight: 700 }}>{homeAbbr}</span> (top) or falls
        toward <span style={{ color: awayPrimary, fontWeight: 700 }}>{awayAbbr}</span> (bottom); the
        shaded area marks the leader.
      </div>
    </Card>
  );
}
