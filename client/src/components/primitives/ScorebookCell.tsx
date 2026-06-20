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

function kindFromCode(code: string): "hit" | "walk" | "out" {
  const c = code.toUpperCase();
  if (c === "1B" || c === "2B" || c === "3B" || c === "HR") return "hit";
  if (c === "BB" || c === "IBB" || c === "HBP") return "walk";
  return "out";
}

function ordinal(n: number): string {
  const s = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return `${n}${s}`;
}

export interface ScorebookCellProps {
  // Design-reference props (from shared.jsx)
  inn?: string;               // inning label on top — "1st", "9th"
  code?: string;              // result code — "1B" "K" "BB" "OUT" "F8" etc.
  kind?: "hit" | "out" | "walk"; // drives bold-path style; derived from code when absent
  reached?: number;           // back-compat shorthand: 0=none 1=1B 2=2B 3=3B 4=HR
  reachedOnPA?: number;       // bases earned at the plate (bold path). Defaults to `reached`.
  finalBase?: number;         // where runner ended (light path). Defaults to reachedOnPA.
  outAt?: number | null;      // base where thrown out — × marker
  stranded?: boolean;         // LOB emphasis (finalBase < home already implies LOB visually)
  scored?: boolean;           // force green diamond fill (e.g. singled + later scored)
  live?: boolean;             // in-progress PA — dashed neutral frame
  width?: number;
  // Backward-compat aliases
  resultCode?: string;        // alias for code
  basesReached?: number;      // alias for reached
  inning?: number;            // number → formatted as ordinal for inn
}

export function ScorebookCell({
  inn, code, kind, reached = 0, reachedOnPA, finalBase, outAt = null,
  stranded = false, scored = false, live = false, width = 44,
  resultCode, basesReached, inning,
}: ScorebookCellProps): ReactElement {
  // Resolve backward-compat aliases
  const resolvedCode = code ?? resultCode ?? "";
  const resolvedReached = basesReached != null && reached === 0 ? basesReached : reached;
  const resolvedInn = inn ?? (inning != null ? ordinal(inning) : undefined);
  const resolvedKind = kind ?? (resolvedCode ? kindFromCode(resolvedCode) : "out");

  const onPA = reachedOnPA != null ? reachedOnPA : resolvedReached;
  const didScore = scored || (finalBase != null ? finalBase >= 4 : onPA >= 4);
  const fin = outAt != null ? outAt : (didScore ? 4 : (finalBase != null ? finalBase : onPA));

  // Bold PA path — what the batter did at the plate
  const boldD = live ? null : seg(0, Math.min(onPA, 4));
  // Light baserunning path — how far he advanced afterward
  const lightD = live ? null : seg(onPA, fin);

  // End-state marker (only when he didn't score)
  let marker: { idx: number; type: "reach" | "lob" | "out" } | null = null;
  if (!live && !didScore) {
    if (outAt != null) marker = { idx: outAt, type: "out" };
    else if (fin > onPA) marker = { idx: fin, type: "lob" };
    else if (onPA > 0) marker = { idx: onPA, type: "reach" };
  }

  const isOut = resolvedKind === "out";
  const cellClass = `scorebook-cell${live ? " scorebook-cell--live" : ""}`;

  return (
    <div className={cellClass} style={{ width }}>
      {resolvedInn != null && (
        <span className="scorebook-cell__inn">{resolvedInn}</span>
      )}

      <svg width={36} height={36} viewBox="0 0 44 44" aria-hidden="true" style={{ display: "block" }}>
        {/* Green fill when a run scored */}
        {didScore && (
          <polygon points="22,41 41,22 22,3 3,22" fill="var(--color-positive-soft)" stroke="none" />
        )}

        {/* Diamond outline */}
        <polygon
          points="22,41 41,22 22,3 3,22"
          fill="none"
          stroke={live ? "var(--color-border-strong)" : "var(--color-border)"}
          strokeWidth="1.5"
          strokeDasharray={live ? "4 3" : undefined}
        />

        {/* Light baserunning path — drawn first so bold PA sits on top at the junction */}
        {lightD != null && (
          <path d={lightD} fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5"
            strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* Bold PA result path — what the batter did; dashed for a walk */}
        {boldD != null && (
          <path d={boldD} fill="none" stroke="var(--color-ink)" strokeWidth="3"
            strokeLinejoin="round" strokeLinecap="round"
            strokeDasharray={resolvedKind === "walk" ? "3 3" : undefined} />
        )}

        {/* Reach marker — solid dot (hollow for walk) */}
        {marker?.type === "reach" && (
          <circle
            cx={PTS[marker.idx][0]} cy={PTS[marker.idx][1]} r={3.2}
            fill={resolvedKind === "walk" ? "var(--color-surface)" : "var(--color-ink)"}
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
      </svg>

      {!live && resolvedCode !== "" && (
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
