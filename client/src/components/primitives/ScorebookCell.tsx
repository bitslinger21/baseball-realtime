import { useId } from "react";
import type { ReactElement } from "react";
import "./ScorebookCell.css";

// Diamond corners: home · 1B · 2B · 3B · home (closes the path)
const PTS: readonly [number, number][] = [
  [22, 41], [41, 22], [22, 3], [3, 22], [22, 41],
];

function seg(from: number, to: number): string | null {
  if (to <= from) return null;
  let d = `M ${PTS[from][0]} ${PTS[from][1]}`;
  for (let i = from + 1; i <= to; i++) d += ` L ${PTS[i][0]} ${PTS[i][1]}`;
  return d;
}

function kindFromCode(code: string): "hit" | "walk" | "hbp" | "fc" | "out" {
  const c = code.toUpperCase();
  if (c === "1B" || c === "2B" || c === "3B" || c === "HR") return "hit";
  if (c === "BB" || c === "IBB") return "walk";
  if (c === "HBP") return "hbp";
  if (c === "FC" || c.startsWith("E")) return "fc";
  return "out";
}

// BB/IBB/HBP also map to base 1 — same foul-line label as 1B (consistent reach-first treatment).
// HR is intentionally not mapped: rendered as a centered code with no drawn circuit path.
function baseFromCode(code: string): 1 | 2 | 3 | null {
  const c = code.toUpperCase();
  if (c === "1B" || c === "BB" || c === "IBB" || c === "HBP") return 1;
  if (c === "2B") return 2;
  if (c === "3B") return 3;
  return null;
}

// Foul-line label positions (viewBox 0 0 44 44, overflow:visible) — in true foul territory
// past the base vertex, not in the diamond corner. 1B vertex is at [41,22]; label at [47,19]
// is 6 units right and 3 above — past the foul-line extension with no SVG content there.
// 3B is the mirror ([-3,19]). These extend outside the viewBox; overflow:visible + the cell's
// own width (40px vs svgSize=32px) contain them in practice.
// No halo rect: the foul-territory area is empty SVG space, readable on the surface background.
const FOUL_LABEL: Readonly<Record<number, readonly [number, number]>> = {
  1: [47, 19],
  2: [22, 4],
  3: [-3, 19],
};

// ── F-006 spray line — ported verbatim from holistic/shared.jsx
// (window.sprayPathFor, window.SPRAY_CELL_RMAX). Every ball in play gets a
// faint line from home toward where it landed; the line's style is the hit
// type: ground = dotted, liner = thin straight, fly = thin arc, popup =
// higher arc. Distance is mapped piecewise — 0–130 ft (the infield) fills the
// first `brk` of the way to the edge, 130–400 ft the rest — because the drawn
// field isn't to scale.
export interface Spray {
  angle: number; // degrees from straight-away CF; −45 = 3B line, +45 = 1B line
  dist: number; // feet
  traj: string; // MLB hitData.trajectory, verbatim
}

function sprayPathFor(
  spray: Spray | null | undefined,
  home: readonly [number, number],
  rMaxAt: (th: number) => number,
  brk: number,
): { d: string; end: [number, number]; dash: string | undefined; ground: boolean } | null {
  if (!spray || spray.angle == null) return null;
  const th = (Math.max(-47, Math.min(47, spray.angle)) * Math.PI) / 180;
  const dir = [Math.sin(th), -Math.cos(th)];
  const R = rMaxAt(th);
  const ft = spray.dist || 0;
  const f = ft <= 130 ? (ft / 130) * brk : brk + (1 - brk) * Math.min(1, (ft - 130) / 270);
  const r = R * Math.max(0.12, Math.min(f, 1));
  const end: [number, number] = [home[0] + dir[0] * r, home[1] + dir[1] * r];
  const t = spray.traj || "ground_ball";
  const ground = t === "ground_ball" || t === "bunt_grounder";
  const arc = t === "fly_ball" || t === "popup" || t === "bunt_popup";
  let d = `M ${home[0]} ${home[1]} L ${end[0].toFixed(2)} ${end[1].toFixed(2)}`;
  if (arc) {
    const k = (t === "fly_ball" ? 0.2 : 0.34) * r * (th > 0 ? -1 : 1);
    const mid = [(home[0] + end[0]) / 2, (home[1] + end[1]) / 2];
    const c = [mid[0] + Math.cos(th) * k, mid[1] + Math.sin(th) * k];
    d = `M ${home[0]} ${home[1]} Q ${c[0].toFixed(2)} ${c[1].toFixed(2)} ${end[0].toFixed(2)} ${end[1].toFixed(2)}`;
  }
  return { d, end, dash: ground ? "0.1 2.6" : undefined, ground };
}

// The 44-unit cell diamond: the spray can reach the far (1B–2B / 2B–3B) edges.
const SPRAY_CELL_RMAX = (th: number): number =>
  26.87 / Math.max(Math.cos(Math.PI / 4 - th), Math.cos(Math.PI / 4 + th));

// field = 'overflow' (decided Oct 10, frame 05): the diamond is unchanged;
// outfield balls run past it into the cell's margin, ending just under the
// inning label. The 'diamond' / 'full' variants were review-only.
const OVERFLOW_RMAX = (th: number): number =>
  Math.min(
    SPRAY_CELL_RMAX(th) * 1.35,
    44 / Math.max(Math.cos(th), 0.01),
    29 / Math.max(Math.abs(Math.sin(th)), 0.01),
  );
const OVERFLOW_BRK = 0.667;

function ordinal(n: number): string {
  const s = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return `${n}${s}`;
}

export interface ScorebookCellProps {
  // Design-reference props (from shared.jsx)
  inn?: string;               // inning label on top — "1st", "9th"
  code?: string;              // result code — "1B" "K" "BB" "OUT" "F8" etc.
  kind?: "hit" | "out" | "walk" | "hbp" | "fc"; // drives bold-path style; derived from code when absent
  reached?: number;           // back-compat shorthand: 0=none 1=1B 2=2B 3=3B 4=HR
  reachedOnPA?: number;       // bases earned at the plate (bold path). Defaults to `reached`.
  finalBase?: number;         // where runner ended (light path). Defaults to reachedOnPA.
  outAt?: number | null;      // base where thrown out — × marker
  stranded?: boolean;         // LOB emphasis
  scored?: boolean;           // force green diamond fill
  live?: boolean;             // in-progress PA — dashed neutral frame
  muted?: boolean;            // dormant/future PA — faint outline, no code, no paths
  active?: boolean;           // selected cell — rust dashed outline (bw: 2)
  codeIn?: boolean;           // code inside diamond with surface halo; drops inn + code-below rows
  spray?: Spray | null;       // F-006: where the ball went — ignored in codeIn (the feed badge)
  width?: number;
  // Backward-compat aliases
  resultCode?: string;
  basesReached?: number;
  inning?: number;
}

export function ScorebookCell({
  inn, code, kind, reached = 0, reachedOnPA, finalBase, outAt = null,
  scored = false, live = false, muted = false, active = false, codeIn = false, width = 44,
  spray = null, resultCode, basesReached, inning,
}: ScorebookCellProps): ReactElement {
  // Resolve backward-compat aliases
  const resolvedCode = code ?? resultCode ?? "";
  const resolvedReached = basesReached != null && reached === 0 ? basesReached : reached;
  const resolvedInn = inn ?? (inning != null ? ordinal(inning) : undefined);
  const resolvedKind = kind ?? (resolvedCode ? kindFromCode(resolvedCode) : "out");

  const onPA = reachedOnPA != null ? reachedOnPA : resolvedReached;
  const didScore = scored || (finalBase != null ? finalBase >= 4 : onPA >= 4);
  const fin = outAt != null ? outAt : (didScore ? 4 : (finalBase != null ? finalBase : onPA));

  const inactive = live || muted;
  const lightD = inactive ? null : seg(onPA, fin);

  // End-state marker (only when active, result is known, batter didn't score)
  let marker: { idx: number; type: "reach" | "lob" | "out" } | null = null;
  if (!inactive && !didScore) {
    if (outAt != null) marker = { idx: outAt, type: "out" };
    else if (fin > onPA) marker = { idx: fin, type: "lob" };
    else if (onPA > 0) marker = { idx: onPA, type: "reach" };
  }

  const isOut = resolvedKind === "out";
  const svgSize = Math.floor(width * 36 / 44);
  const clipId = useId();

  // codeIn sizing — in viewBox units (viewBox is 0 0 44 44)
  const codeLen = resolvedCode.length;
  const inFontSize = codeLen <= 1 ? 14 : codeLen <= 2 ? 12 : codeLen <= 3 ? 10 : 8;
  const inHaloW = codeLen <= 1 ? 13 : codeLen <= 2 ? 18 : codeLen <= 3 ? 22 : 26;
  const inHaloH = 13;

  // For codeIn reach codes, use foul-line position so the label doesn't sit on the infield.
  // A HR has no foul-line spot: its code sits centred on its halo, over the
  // full bold diamond like every other hit's path (PROMPT_bug_fixes_oct9.md D1).
  const hitBase = codeIn ? baseFromCode(resolvedCode) : null;
  const [codeInX, codeInY] = hitBase != null ? FOUL_LABEL[hitBase] : [22, 22];
  const boldD = inactive ? null : seg(0, Math.min(onPA, 4));
  // The feed badge (codeIn) never draws a spray line, and a live cell has no result yet.
  const sp = !codeIn && !live ? sprayPathFor(spray, [22, 41], OVERFLOW_RMAX, OVERFLOW_BRK) : null;

  let cellClass = "scorebook-cell";
  if (!codeIn) cellClass += " scorebook-cell--field";
  if (live) cellClass += " scorebook-cell--live";
  if (muted) cellClass += " scorebook-cell--muted";

  return (
    <div className={cellClass} style={{ width }}>
      {!codeIn && resolvedInn != null && (
        <span className="scorebook-cell__inn">{resolvedInn}</span>
      )}

      <svg width={svgSize} height={svgSize} viewBox="0 0 44 44" overflow="visible" aria-hidden="true" style={{ display: "block" }}>
        <defs>
          <clipPath id={clipId}><rect x="0" y="0" width="44" height="44" /></clipPath>
        </defs>
        {/* Green fill when a run scored */}
        {didScore && !inactive && (
          <polygon points="22,41 41,22 22,3 3,22" fill="var(--color-positive-soft)" stroke="none" />
        )}

        {/* Diamond outline — rust dashed when active, neutral dashed when live-only */}
        <polygon
          points="22,41 41,22 22,3 3,22"
          fill="none"
          stroke={
            active ? "var(--color-accent)" :
            live ? "var(--color-border-strong)" :
            "var(--color-border)"
          }
          strokeWidth={active ? 2 : 1.5}
          strokeDasharray={(live || active) ? "4 3" : undefined}
        />

        {/* F-006 spray line — under the base paths */}
        {sp != null && (
          <g>
            <path d={sp.d} fill="none" stroke={muted ? "var(--color-text-faint)" : "var(--color-text-muted)"}
              strokeWidth={sp.ground ? 1.6 : 1.1} strokeLinecap="round" strokeDasharray={sp.dash} />
            <circle cx={sp.end[0]} cy={sp.end[1]} r="1.7" fill={muted ? "var(--color-text-faint)" : "var(--color-text-muted)"} />
          </g>
        )}

        {/* Light baserunning path */}
        {lightD != null && (
          <path d={lightD} fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5"
            strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* Bold PA result path — walk=dashed, hbp=dotted; a hit, FC or error is
            solid (F-006 B2: the code carries the difference) */}
        {boldD != null && (
          <path d={boldD} fill="none" stroke="var(--color-ink)" strokeWidth="3"
            strokeLinejoin="round" strokeLinecap="round"
            strokeDasharray={
              resolvedKind === "walk" ? "3 3" :
              resolvedKind === "hbp" ? "2 3" :
              undefined
            } />
        )}

        {/* Reach marker — hollow for walk/hbp, solid for a hit, FC or error */}
        {marker?.type === "reach" && (
          <circle
            cx={PTS[marker.idx][0]} cy={PTS[marker.idx][1]} r={3.2}
            fill={(resolvedKind === "walk" || resolvedKind === "hbp") ? "var(--color-surface)" : "var(--color-ink)"}
            stroke="var(--color-ink)" strokeWidth="1.5"
          />
        )}

        {/* LOB marker — hollow ring */}
        {marker?.type === "lob" && (
          <circle
            cx={PTS[marker.idx][0]} cy={PTS[marker.idx][1]} r={3.4}
            fill="var(--color-surface)" stroke="var(--color-text-muted)" strokeWidth="1.5"
          />
        )}

        {/* Out-on-bases marker — × */}
        {marker?.type === "out" && (
          <g stroke="var(--color-ink)" strokeWidth="1.6" strokeLinecap="round">
            <line x1={PTS[marker.idx][0] - 3} y1={PTS[marker.idx][1] - 3}
              x2={PTS[marker.idx][0] + 3} y2={PTS[marker.idx][1] + 3} />
            <line x1={PTS[marker.idx][0] - 3} y1={PTS[marker.idx][1] + 3}
              x2={PTS[marker.idx][0] + 3} y2={PTS[marker.idx][1] - 3} />
          </g>
        )}

        {/* codeIn: result code label.
            Reach codes (1B/BB/HBP/2B/3B): text-only in the open foul-territory corner —
            no halo needed since those corners are empty SVG space.
            Centered codes (HR, outs, etc.): halo rect + text, clipped to this cell's viewBox. */}
        {codeIn && !muted && resolvedCode !== "" && (
          hitBase != null ? (
            <text
              x={codeInX} y={codeInY}
              dominantBaseline="central"
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontWeight="700"
              fontSize={inFontSize}
              fill="var(--color-ink)"
            >
              {resolvedCode}
            </text>
          ) : (
            <g clipPath={`url(#${clipId})`}>
              {!didScore && (
                <rect
                  x={codeInX - inHaloW / 2} y={codeInY - inHaloH / 2}
                  width={inHaloW} height={inHaloH}
                  fill="var(--color-surface)" rx="2"
                />
              )}
              <text
                x={codeInX} y={codeInY}
                dominantBaseline="central"
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontWeight="700"
                fontSize={inFontSize}
                fill={isOut ? "var(--color-text-muted)" : "var(--color-ink)"}
              >
                {resolvedCode}
              </text>
            </g>
          )
        )}
      </svg>

      {/* code-below — only when NOT codeIn mode and result is known */}
      {!codeIn && !inactive && resolvedCode !== "" && (
        <span
          className="scorebook-cell__code"
          style={{
            color: isOut ? "var(--color-text-muted)" : "var(--color-text)",
            fontSize: resolvedCode.length >= 5 ? 9 : undefined,
          }}
        >
          {resolvedCode}
        </span>
      )}
    </div>
  );
}
