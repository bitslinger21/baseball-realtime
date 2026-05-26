import type { ReactElement, RefObject } from "react";
import { useState } from "react";
import type { AtBatState } from "../../components/AtBatCard/atBatTypes";
import { Pill } from "../../components/primitives/Pill";
import { Th } from "../../components/primitives/Table";
import { Td } from "../../components/primitives/Table";
import "./PitchByPitch.css";

const PITCH_COLORS: Record<string, string> = {
  FF: "#dc2626", FA: "#dc2626",
  SI: "#ea580c", FT: "#ea580c",
  SL: "#0891b2",
  CU: "#3b82f6", KC: "#3b82f6",
  CH: "#16a34a",
  FC: "#a3a3a3",
  SW: "#7c3aed", ST: "#7c3aed",
  FS: "#14b8a6",
  KN: "#f59e0b",
};

function pitchColor(code: string): string {
  return PITCH_COLORS[code.toUpperCase()] ?? "#75706a";
}

function halfLabel(half: "top" | "bottom", inning: number): string {
  return `${half === "top" ? "TOP" : "BOT"} ${inning}`;
}

interface ZoneChipProps {
  pitchX?: number;
  pitchZ?: number;
  szTop?: number;
  szBottom?: number;
}

function ZoneChip({ pitchX, pitchZ, szTop = 3.5, szBottom = 1.5 }: ZoneChipProps): ReactElement {
  const zoneHalf = 0.835;
  const col = pitchX != null ? Math.floor(((pitchX + zoneHalf) / (2 * zoneHalf)) * 3) : -1;
  const row = pitchX != null && pitchZ != null
    ? Math.floor(((szTop - pitchZ) / (szTop - szBottom)) * 3)
    : -1;
  const n = col >= 0 && row >= 0 ? row * 3 + col : -1;

  return (
    <div className="pbp-zone-chip">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className={`pbp-zone-chip__cell${i === n ? " pbp-zone-chip__cell--on" : ""}`} />
      ))}
    </div>
  );
}

interface PitchByPitchProps {
  completedAtBats: AtBatState[];
  currentAtBat: AtBatState | null;
  feedScrollRef: RefObject<HTMLDivElement | null>;
}

export function PitchByPitch({
  completedAtBats,
  currentAtBat,
  feedScrollRef,
}: PitchByPitchProps): ReactElement {
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set());

  function toggle(idx: number): void {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const hasContent = completedAtBats.length > 0 || currentAtBat != null;

  return (
    <div className="pitch-by-pitch">
      <div className="pitch-by-pitch__header">
        <span className="pitch-by-pitch__title">Pitch by pitch</span>
      </div>

      <div className="pa-feed" ref={feedScrollRef}>
        {!hasContent && (
          <div className="pitch-by-pitch__empty">Waiting for updates…</div>
        )}

        {completedAtBats.map((atBat, i) => {
          const isOpen = expanded.has(atBat.atBatIndex);
          const lastPitch = atBat.pitches[atBat.pitches.length - 1];
          return (
            <div
              key={atBat.atBatIndex}
              id={`pa-${atBat.atBatIndex}`}
              className="pa-row"
            >
              <div className="pa-row__header" onClick={() => toggle(atBat.atBatIndex)}>
                <div className="pa-row__meta">
                  <span className="pa-row__inning num">{halfLabel(atBat.half, atBat.inning)}</span>
                </div>
                <div className="pa-row__outcome-badge">
                  {atBat.result != null
                    ? <span className="pa-row__result-text">{atBat.result}</span>
                    : <span className="pa-row__result-text pa-row__result-text--muted">—</span>
                  }
                </div>
                <div className="pa-row__name-block">
                  <span className="pa-row__batter">{atBat.batterName}</span>
                  {atBat.finalCount != null && (
                    <span className="pa-row__count num">{atBat.finalCount}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="pa-row__toggle"
                  aria-label={isOpen ? "Collapse" : "Expand"}
                >
                  {atBat.pitches.length > 0 ? (isOpen ? "▴" : "▾") : "—"}
                </button>
              </div>

              {isOpen && atBat.pitches.length > 0 && (
                <div className="pa-row__pitches">
                  <PitchTable atBat={atBat} />
                </div>
              )}
            </div>
          );
        })}

        {currentAtBat != null && (
          <div
            id={`pa-${currentAtBat.atBatIndex}`}
            className="pa-row pa-row--live"
          >
            <div className="pa-row__header">
              <div className="pa-row__meta">
                <span className="pa-row__inning num">
                  {halfLabel(currentAtBat.half, currentAtBat.inning)}
                </span>
              </div>
              <div className="pa-row__outcome-badge">
                <Pill tone="live" style={{ fontSize: 11 }}>LIVE</Pill>
              </div>
              <div className="pa-row__name-block">
                <span className="pa-row__batter">{currentAtBat.batterName}</span>
              </div>
            </div>

            {currentAtBat.pitches.length > 0 && (
              <div className="pa-row__pitches">
                <PitchTable atBat={currentAtBat} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PitchTable({ atBat }: { atBat: AtBatState }): ReactElement {
  return (
    <table className="pbp-table">
      <thead>
        <tr>
          <Th align="left" style={{ paddingLeft: 14, paddingTop: 6, paddingBottom: 6 }}>#</Th>
          <Th align="left" style={{ paddingTop: 6, paddingBottom: 6 }}>Pitch</Th>
          <Th style={{ paddingTop: 6, paddingBottom: 6 }}>Velo</Th>
          <Th style={{ paddingTop: 6, paddingBottom: 6 }}>Zone</Th>
          <Th align="left" style={{ paddingTop: 6, paddingBottom: 6 }}>Result</Th>
          <Th style={{ paddingTop: 6, paddingBottom: 6 }}>Count</Th>
        </tr>
      </thead>
      <tbody>
        {atBat.pitches.map((p) => (
          <tr key={p.seq} className={p.isLastPitch ? "pbp-table__row--last" : undefined}>
            <Td align="left" dim style={{ paddingLeft: 14 }}>{p.seq}</Td>
            <Td align="left" mono={false} style={{ fontWeight: 600 }}>
              <span className="pbp-pitch-type">
                <span
                  className="pbp-pitch-dot"
                  style={{ background: pitchColor(p.pitchTypeCode) }}
                />
                {p.pitchTypeName}
              </span>
            </Td>
            <Td>{p.speedMph != null ? p.speedMph.toFixed(1) : "—"}</Td>
            <Td>
              <ZoneChip
                pitchX={p.pitchX}
                pitchZ={p.pitchZ}
                szTop={atBat.strikeZoneTop}
                szBottom={atBat.strikeZoneBottom}
              />
            </Td>
            <Td align="left" mono={false} hot={p.isLastPitch} style={{ fontWeight: p.isLastPitch ? 600 : 500 }}>
              {p.result || "—"}
            </Td>
            <Td dim>{p.count}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
