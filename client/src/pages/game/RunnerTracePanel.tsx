import React, { useEffect, useRef } from "react";
import type { ReactElement } from "react";
import type { AtBatState } from "../../components/AtBatCard/atBatTypes";
import "./RunnerTracePanel.css";

// Movement colour system: rust → navy → green → gold, cycle navy/gold beyond index 3.
// Green always terminates a scoring trace; stranded/out final gets muted.
const MOVE_COLORS = ['#b8421e', '#2c4a78', '#3f6b34', '#7a5c0e'] as const;
const STRANDED_COLOR = '#5c574f';

function moveColor(eventIdx: number, isFinal: boolean, scored: boolean): string {
  if (eventIdx === 0) return MOVE_COLORS[0];
  const raw = eventIdx < MOVE_COLORS.length
    ? MOVE_COLORS[eventIdx]
    : (eventIdx % 2 === 1 ? MOVE_COLORS[1] : MOVE_COLORS[3]);
  return isFinal && !scored ? STRANDED_COLOR : raw;
}

interface RunnerTracePanelProps {
  runnerAtBatIndex: number;
  completedAtBats: AtBatState[];
  runnerFinalBaseByAtBat: ReadonlyMap<number, ReadonlyArray<{ base: number; advancedByAtBatIndex?: number }>>;
  onClose: () => void;
  closing?: boolean;
  /** atBatIndex of the driver cell currently hovered on the scorecard (reverse binding) */
  hoveredAbIdx?: number | null;
  /** Called when a timeline row is hovered/unhovered */
  onEventHover?: (abIdx: number | null) => void;
}

function getInitialBase(result: string | undefined): number {
  if (!result) return 0;
  if (result === "HomeRun") return 4;
  if (result === "Triple") return 3;
  if (result === "Double") return 2;
  const FIRST = ["Single", "Walk", "IntentionalWalk", "HitByPitch", "HBP", "Error", "FieldersChoice", "SacBunt"];
  return FIRST.includes(result) ? 1 : 0;
}

function formatResult(result: string | undefined): string {
  if (!result) return "—";
  const MAP: Record<string, string> = {
    Single: "Single", Double: "Double", Triple: "Triple", HomeRun: "Home Run",
    Walk: "Walk", IntentionalWalk: "Intentional Walk", HitByPitch: "Hit by Pitch", HBP: "Hit by Pitch",
    Strikeout: "Strikeout", Groundout: "Groundout", Flyout: "Flyout",
    Lineout: "Line Out", PopOut: "Pop Out", FieldersChoice: "Fielder's Choice",
    Error: "Reached on Error", SacFly: "Sac Fly", SacBunt: "Sac Bunt",
    DoublePlay: "Double Play",
  };
  return MAP[result] ?? result;
}

const OUT_RESULTS = new Set([
  "Strikeout", "Groundout", "Flyout", "Lineout", "PopOut", "Out",
  "SacFly", "SacBunt", "DoublePlay", "TriplePlay",
]);

function outsBefore(driverAb: AtBatState, allAbs: AtBatState[]): number {
  return allAbs.filter(
    (ab) =>
      ab.inning === driverAb.inning &&
      ab.half === driverAb.half &&
      ab.atBatIndex < driverAb.atBatIndex &&
      OUT_RESULTS.has(ab.result ?? ""),
  ).length;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

const BASE_LABELS = ["", "1B", "2B", "3B", "H"];

// Diamond coords — matches scorebook-cell.js geometry
const H: [number, number] = [50, 90];
const F: [number, number] = [81.82, 58.18];
const S: [number, number] = [50, 26.36];
const T: [number, number] = [18.18, 58.18];
const CORNERS: [number, number][] = [H, F, S, T, H];

function diamondSegPath(fromBase: number, toBase: number): string {
  const pts: string[] = [];
  for (let b = fromBase + 1; b <= Math.min(toBase, 4); b++) {
    const [ax, ay] = CORNERS[b - 1];
    const [bx, by] = CORNERS[b];
    pts.push(`M${ax},${ay} L${bx},${by}`);
  }
  return pts.join(' ');
}

interface DiamondSegment { fromBase: number; toBase: number; color: string }

function DiamondSVG({ startBase, segments }: { startBase: number; segments: DiamondSegment[] }): ReactElement {
  const finalBase = segments.length > 0 ? segments[segments.length - 1].toBase : startBase;
  const scored = finalBase >= 4;

  return (
    <svg viewBox="0 0 100 100" className="rtp__diamond" xmlns="http://www.w3.org/2000/svg" style={{ overflow: "visible" }}>
      {/* Field */}
      <path d="M95.12,44.88 A47.5,47.5 0 0 0 4.88,44.88" fill="none" stroke="#cfc8b4" strokeWidth="1.5" opacity="0.5" />
      <circle cx="50" cy="59.75" r="4" fill="none" stroke="#cfc8b4" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.6" />
      <path d="M55.66,32.02 L76.16,52.52 A8,8 0 0 0 76.16,63.84 L55.66,84.34 A8,8 0 0 0 44.34,84.34 L23.84,63.84 A8,8 0 0 0 23.84,52.52 L44.34,32.02 A8,8 0 0 0 55.66,32.02" fill="none" stroke="#cfc8b4" strokeWidth="1.5" />
      <path d="M76.16,63.84 L95.12,44.88" fill="none" stroke="#cfc8b4" strokeWidth="1.5" />
      <path d="M23.84,63.84 L4.88,44.88" fill="none" stroke="#cfc8b4" strokeWidth="1.5" />

      {scored && (
        <polygon points={`${H[0]},${H[1]} ${F[0]},${F[1]} ${S[0]},${S[1]} ${T[0]},${T[1]}`} fill="rgba(63,107,52,0.12)" />
      )}

      {/* Origin path: home → startBase in rust */}
      {startBase > 0 && (
        <path d={diamondSegPath(0, startBase)} stroke="#b8421e" strokeWidth="3" strokeLinecap="round" fill="none" />
      )}

      {/* Advancement segments in their movement colour */}
      {segments.map((seg, i) => (
        <path key={i} d={diamondSegPath(seg.fromBase, seg.toBase)} stroke={seg.color} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      ))}

      {/* Base dots */}
      {([F, S, T] as [number, number][]).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="#fcfaf6" stroke="#b4ae9b" strokeWidth="1.5" />
      ))}
      <circle cx={H[0]} cy={H[1]} r="3.5" fill="#fcfaf6" stroke="#b4ae9b" strokeWidth="1.5" />

      {/* Final base highlight dot */}
      {finalBase > 0 && finalBase <= 4 && (
        <circle
          cx={CORNERS[Math.min(finalBase, 4)][0]}
          cy={CORNERS[Math.min(finalBase, 4)][1]}
          r="4.5"
          fill={scored ? "#3f6b34" : STRANDED_COLOR}
          opacity={0.85}
        />
      )}

      {/* Base labels — outside the field */}
      <text x="88" y="58" fontSize="8" fontFamily="'JetBrains Mono',monospace" fontWeight="700" fill="#5c574f" textAnchor="middle">1B</text>
      <text x="50" y="18" fontSize="8" fontFamily="'JetBrains Mono',monospace" fontWeight="700" fill="#5c574f" textAnchor="middle">2B</text>
      <text x="12" y="58" fontSize="8" fontFamily="'JetBrains Mono',monospace" fontWeight="700" fill="#5c574f" textAnchor="middle">3B</text>
      <text x="50" y="100" fontSize="8" fontFamily="'JetBrains Mono',monospace" fontWeight="700" fill="#5c574f" textAnchor="middle">H</text>
    </svg>
  );
}

export function RunnerTracePanel({
  runnerAtBatIndex,
  completedAtBats,
  runnerFinalBaseByAtBat,
  onClose,
  closing,
  hoveredAbIdx,
  onEventHover,
}: RunnerTracePanelProps): ReactElement {
  const panelRef = useRef<HTMLDivElement>(null);

  const runnerAb = completedAtBats.find((ab) => ab.atBatIndex === runnerAtBatIndex);
  const advances = runnerFinalBaseByAtBat.get(runnerAtBatIndex) ?? [];

  const startBase = getInitialBase(runnerAb?.result);
  const finalBase = advances.length > 0 ? advances[advances.length - 1].base : startBase;
  const scored = finalBase >= 4;
  const finalResult: "scored" | "stranded" = scored ? "scored" : "stranded";

  // Build per-segment diamond data
  const diamondSegments: DiamondSegment[] = advances.map((adv, i) => {
    const fromBase = i === 0 ? startBase : Math.min(advances[i - 1].base, 4);
    const toBase = Math.min(adv.base, 4);
    const isFinal = i === advances.length - 1;
    return { fromBase, toBase, color: moveColor(i + 1, isFinal, scored) };
  });

  useEffect(() => {
    const handler = (e: PointerEvent): void => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const inningLabel = runnerAb != null
    ? `${runnerAb.half === "top" ? "Top" : "Bot"} ${ordinal(runnerAb.inning)}`
    : null;

  const lastName = (name: string): string => name.split(" ").pop() ?? name;

  const totalEvents = 1 + advances.length; // origin + each advancement

  return (
    <div className={`rtp${closing ? " rtp--closing" : ""}`} ref={panelRef} role="dialog" aria-label="Runner trace">
      {/* Header */}
      <div className="rtp__header">
        <span className="rtp__title">RUNNER TRACE</span>
        <button className="rtp__close" onClick={onClose} aria-label="Close" type="button">✕</button>
      </div>

      {/* Player block: name + badges left, diamond right */}
      <div className="rtp__player">
        <div className="rtp__player-info">
          <span className="rtp__player-name">{runnerAb?.batterName ?? "—"}</span>
          <div className="rtp__badges">
            {inningLabel && <span className="rtp__badge rtp__badge--inning">{inningLabel}</span>}
            <span className={`rtp__badge rtp__badge--result rtp__badge--${finalResult}`}>
              {finalResult === "scored" ? "SCORED" : "STRANDED"}
            </span>
          </div>
        </div>
        <div className="rtp__diamond-wrap">
          <DiamondSVG startBase={startBase} segments={diamondSegments} />
        </div>
      </div>

      <div className="rtp__divider" />

      {/* Timeline — two-column grid: 58px gutter + content */}
      <div className="rtp__timeline">

        {/* Origin event */}
        {startBase > 0 && (() => {
          const color = '#b8421e';
          const hasNext = advances.length > 0;
          const isHovered = hoveredAbIdx === runnerAtBatIndex;
          return (
            <div
              className={`rtp__event${isHovered ? " rtp__event--hovered" : ""}`}
              onMouseEnter={() => onEventHover?.(runnerAtBatIndex)}
              onMouseLeave={() => onEventHover?.(null)}
            >
              <div className="rtp__event-gutter">
                <div className="rtp__event-badges">
                  <span className="rtp__base-badge rtp__base-badge--origin" style={{ borderColor: color, color }}>
                    {BASE_LABELS[startBase]}
                  </span>
                </div>
                {hasNext && <div className="rtp__event-connector" />}
              </div>
              <div className="rtp__event-body">
                <span className="rtp__event-play" style={{ color }}>
                  {formatResult(runnerAb?.result)}
                </span>
                <span className="rtp__event-detail">{lastName(runnerAb?.batterName ?? "—")} reaches base</span>
              </div>
            </div>
          );
        })()}

        {/* Advancement events */}
        {advances.map((adv, i) => {
          const driverAb = adv.advancedByAtBatIndex != null
            ? completedAtBats.find((ab) => ab.atBatIndex === adv.advancedByAtBatIndex)
            : null;
          const toBase = Math.min(adv.base, 4);
          const fromBase = i === 0 ? startBase : Math.min(advances[i - 1].base, 4);
          const isScoring = toBase >= 4;
          const isFinal = i === advances.length - 1;
          const eventIdx = i + 1;
          const color = moveColor(eventIdx, isFinal, scored);
          const hasNext = i < advances.length - 1;
          const outs = driverAb != null ? outsBefore(driverAb, completedAtBats) : null;

          const playTitle = driverAb != null
            ? `${isScoring ? "Scored" : "Advanced"} on ${lastName(driverAb.batterName ?? "")} ${formatResult(driverAb.result)}`
            : isScoring ? "Scored" : `Advanced to ${BASE_LABELS[toBase]}`;
          const playDetail = driverAb != null && outs != null
            ? `${formatResult(driverAb.result)}, ${outs} out${outs === 1 ? "" : "s"}`
            : null;

          const driverAbIdx = adv.advancedByAtBatIndex ?? null;
          const isHovered = driverAbIdx != null && hoveredAbIdx === driverAbIdx;

          return (
            <div
              key={i}
              className={`rtp__event${isHovered ? " rtp__event--hovered" : ""}`}
              onMouseEnter={() => driverAbIdx != null && onEventHover?.(driverAbIdx)}
              onMouseLeave={() => onEventHover?.(null)}
            >
              <div className="rtp__event-gutter">
                <div className="rtp__event-badges">
                  <span className="rtp__base-badge rtp__base-badge--move" style={{ borderColor: color, color }}>
                    {BASE_LABELS[fromBase]}
                  </span>
                  <span className="rtp__event-arrow">→</span>
                  <span className="rtp__base-badge rtp__base-badge--move" style={{ borderColor: color, color }}>
                    {BASE_LABELS[toBase]}
                  </span>
                </div>
                {hasNext && <div className="rtp__event-connector" />}
              </div>
              <div className="rtp__event-body">
                <span className="rtp__event-play">{playTitle}</span>
                {playDetail != null && <span className="rtp__event-detail">{playDetail}</span>}
              </div>
            </div>
          );
        })}

        {startBase === 0 && advances.length === 0 && (
          <div className="rtp__empty">No trace data available</div>
        )}
      </div>
    </div>
  );
}
