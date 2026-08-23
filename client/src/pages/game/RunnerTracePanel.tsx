import React, { useEffect, useRef } from "react";
import type { ReactElement } from "react";
import type { AtBatState } from "../../components/AtBatCard/atBatTypes";
import "./RunnerTracePanel.css";

interface RunnerTracePanelProps {
  runnerAtBatIndex: number;
  completedAtBats: AtBatState[];
  runnerFinalBaseByAtBat: ReadonlyMap<number, ReadonlyArray<{ base: number; advancedByAtBatIndex?: number }>>;
  onClose: () => void;
  closing?: boolean;
}

function getInitialBase(result: string | undefined): number {
  if (!result) return 0;
  if (result === "HomeRun") return 4;
  if (result === "Triple") return 3;
  if (result === "Double") return 2;
  const FIRST = ["Single", "Walk", "IntentionalWalk", "HitByPitch", "Error", "FieldersChoice", "SacBunt"];
  return FIRST.includes(result) ? 1 : 0;
}

function formatResult(result: string | undefined): string {
  if (!result) return "—";
  const MAP: Record<string, string> = {
    Single: "Single",
    Double: "Double",
    Triple: "Triple",
    HomeRun: "Home Run",
    Walk: "Walk",
    IntentionalWalk: "Intentional Walk",
    HitByPitch: "Hit by Pitch",
    Strikeout: "Strikeout",
    Groundout: "Groundout",
    Flyout: "Flyout",
    Lineout: "Line Out",
    PopOut: "Pop Out",
    FieldersChoice: "Fielder's Choice",
    Error: "Reached on Error",
    SacFly: "Sac Fly",
    SacBunt: "Sac Bunt",
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

// Diamond coordinates (100×100 viewBox) — matches scorebook-cell.js geometry
const H: [number, number] = [50, 90];
const F: [number, number] = [81.82, 58.18];
const S: [number, number] = [50, 26.36];
const T: [number, number] = [18.18, 58.18];
const CORNERS: [number, number][] = [H, F, S, T, H];

function DiamondSVG({ startBase, traceStops }: { startBase: number; traceStops: number[] }): ReactElement {
  const scored = traceStops.some((b) => b >= 4);
  const finalBase = traceStops.length > 0 ? Math.min(traceStops[traceStops.length - 1], 4) : startBase;

  // Build path segments: from startBase through each traceStop.
  // Segments that reach home on a scoring play go into scoringLines (rendered green).
  const allBases = [startBase, ...traceStops];
  const traceLines: string[] = [];
  const scoringLines: string[] = [];
  for (let i = 0; i < allBases.length - 1; i++) {
    const from = Math.min(allBases[i], 4);
    const to = Math.min(allBases[i + 1], 4);
    for (let b = from + 1; b <= to; b++) {
      const [ax, ay] = CORNERS[b - 1];
      const [bx, by] = CORNERS[b];
      const seg = `M${ax},${ay} L${bx},${by}`;
      if (b === 4 && scored) {
        scoringLines.push(seg);
      } else {
        traceLines.push(seg);
      }
    }
  }

  // Bold lines for the initial PA reach (1B path if Single, etc.)
  const boldLines: string[] = [];
  for (let b = 1; b <= startBase; b++) {
    const [ax, ay] = CORNERS[b - 1];
    const [bx, by] = CORNERS[b];
    boldLines.push(`M${ax},${ay} L${bx},${by}`);
  }

  return (
    <svg viewBox="0 0 100 100" className="rtp__diamond" xmlns="http://www.w3.org/2000/svg" style={{ overflow: "visible" }}>
      {/* Outfield arc */}
      <path d="M95.12,44.88 A47.5,47.5 0 0 0 4.88,44.88" fill="none" stroke="#cfc8b4" strokeWidth="1.5" opacity="0.5" />
      {/* Pitcher's mound */}
      <circle cx="50" cy="59.75" r="4" fill="none" stroke="#cfc8b4" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.6" />
      {/* Diamond outline */}
      <path d="M55.66,32.02 L76.16,52.52 A8,8 0 0 0 76.16,63.84 L55.66,84.34 A8,8 0 0 0 44.34,84.34 L23.84,63.84 A8,8 0 0 0 23.84,52.52 L44.34,32.02 A8,8 0 0 0 55.66,32.02" fill="none" stroke="#cfc8b4" strokeWidth="1.5" />
      {/* Foul lines */}
      <path d="M76.16,63.84 L95.12,44.88" fill="none" stroke="#cfc8b4" strokeWidth="1.5" />
      <path d="M23.84,63.84 L4.88,44.88" fill="none" stroke="#cfc8b4" strokeWidth="1.5" />

      {/* Green diamond fill if scored */}
      {scored && (
        <polygon points={`${H[0]},${H[1]} ${F[0]},${F[1]} ${S[0]},${S[1]} ${T[0]},${T[1]}`} fill="rgba(63,107,52,0.12)" />
      )}

      {/* Runner's bold path (own PA) */}
      {boldLines.map((d, i) => (
        <path key={`bold-${i}`} d={d} stroke="#b8421e" strokeWidth="3" strokeLinecap="round" fill="none" />
      ))}

      {/* Advancement lines — gray for intermediate stops, green for the run home */}
      {traceLines.map((d, i) => (
        <path key={`adv-${i}`} d={d} stroke="#75706a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      ))}
      {scoringLines.map((d, i) => (
        <path key={`score-${i}`} d={d} stroke="#3f6b34" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      ))}

      {/* Base dots — faint outline */}
      {([F, S, T] as [number, number][]).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="#fcfaf6" stroke="#b4ae9b" strokeWidth="1.5" />
      ))}
      {/* Home plate dot */}
      <circle cx={H[0]} cy={H[1]} r="3.5" fill="#fcfaf6" stroke="#b4ae9b" strokeWidth="1.5" />

      {/* Final base highlight */}
      {finalBase > 0 && (
        <circle
          cx={CORNERS[finalBase][0]}
          cy={CORNERS[finalBase][1]}
          r="4.5"
          fill={scored ? "#3f6b34" : "#b8421e"}
          opacity={0.85}
        />
      )}

      {/* Base labels */}
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
}: RunnerTracePanelProps): ReactElement {
  const panelRef = useRef<HTMLDivElement>(null);

  const runnerAb = completedAtBats.find((ab) => ab.atBatIndex === runnerAtBatIndex);
  const advances = runnerFinalBaseByAtBat.get(runnerAtBatIndex) ?? [];

  const startBase = getInitialBase(runnerAb?.result);
  const traceStops = advances.map((a) => a.base);
  const finalBase = traceStops.length > 0 ? traceStops[traceStops.length - 1] : startBase;
  const scored = finalBase >= 4;
  const finalResult: "scored" | "stranded" = scored ? "scored" : "stranded";

  // Pointer-outside to close — must use pointerdown, not mousedown, because the scorecard
  // viewport calls e.preventDefault() on pointerdown which suppresses mousedown entirely.
  useEffect(() => {
    const handler = (e: PointerEvent): void => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [onClose]);

  // Esc to close
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

  const firstName = (name: string): string => name.split(" ").pop() ?? name;

  return (
    <div className={`rtp${closing ? " rtp--closing" : ""}`} ref={panelRef} role="dialog" aria-label="Runner trace">
      {/* Header */}
      <div className="rtp__header">
        <span className="rtp__title">RUNNER TRACE</span>
        <button className="rtp__close" onClick={onClose} aria-label="Close" type="button">✕</button>
      </div>

      {/* Player section */}
      <div className="rtp__player">
        <div className="rtp__player-info">
          <span className="rtp__player-name">{runnerAb?.batterName ?? "—"}</span>
          <div className="rtp__badges">
            {inningLabel && <span className="rtp__badge rtp__badge--inning">{inningLabel}</span>}
            <span className={`rtp__badge rtp__badge--result rtp__badge--${finalResult}`}>
              {finalResult === "scored" ? "Scored" : "Stranded"}
            </span>
          </div>
        </div>
        {/* Diamond */}
        <div className="rtp__diamond-wrap">
          <DiamondSVG startBase={startBase} traceStops={traceStops} />
        </div>
      </div>

      {/* Divider */}
      <div className="rtp__divider" />

      {/* Timeline */}
      <div className="rtp__timeline">
        {/* Own PA event */}
        {startBase > 0 && (
          <>
            <div className="rtp__event rtp__event--own">
              <div className="rtp__event-badges">
                <span className="rtp__base-badge rtp__base-badge--own">{BASE_LABELS[startBase]}</span>
              </div>
              <div className="rtp__event-body">
                <span className="rtp__event-play">{formatResult(runnerAb?.result)}</span>
                <span className="rtp__event-detail">{firstName(runnerAb?.batterName ?? "—")} reaches base</span>
              </div>
            </div>
            {advances.length > 0 && <div className="rtp__connector" />}
          </>
        )}

        {/* Advancement events */}
        {advances.map((adv, i) => {
          const driverAb = adv.advancedByAtBatIndex != null
            ? completedAtBats.find((ab) => ab.atBatIndex === adv.advancedByAtBatIndex)
            : null;
          const toBase = Math.min(adv.base, 4);
          const fromBase = i === 0 ? startBase : Math.min(advances[i - 1].base, 4);
          const isScoring = toBase >= 4;
          const outs = driverAb != null ? outsBefore(driverAb, completedAtBats) : null;
          const playTitle = driverAb != null
            ? `${isScoring ? "Scored" : "Advanced"} on ${firstName(driverAb.batterName)} ${formatResult(driverAb.result)}`
            : isScoring ? "Scored" : `Advanced to ${BASE_LABELS[toBase]}`;
          const playDetail = driverAb != null
            ? `${formatResult(driverAb.result)}, ${outs} out${outs === 1 ? "" : "s"}`
            : null;

          const isLast = i === advances.length - 1;
          return (
            <React.Fragment key={i}>
              <div className="rtp__event">
                <div className="rtp__event-badges">
                  <span className="rtp__base-badge rtp__base-badge--own">{BASE_LABELS[fromBase]}</span>
                  <span className="rtp__event-arrow">→</span>
                  <span className={`rtp__base-badge${isScoring ? " rtp__base-badge--scored" : " rtp__base-badge--own"}`}>
                    {BASE_LABELS[toBase]}
                  </span>
                </div>
                <div className="rtp__event-body">
                  <span className="rtp__event-play">{playTitle}</span>
                  {playDetail != null && <span className="rtp__event-detail">{playDetail}</span>}
                </div>
              </div>
              {!isLast && <div className="rtp__connector" />}
            </React.Fragment>
          );
        })}

        {startBase === 0 && advances.length === 0 && (
          <div className="rtp__empty">No trace data available</div>
        )}
      </div>
    </div>
  );
}
