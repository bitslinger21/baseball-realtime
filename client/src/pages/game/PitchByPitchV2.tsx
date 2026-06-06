import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import type { GameViewDto } from "@bitslinger21/baseball-realtime-client";
import type { AtBatState } from "../../components/AtBatCard/atBatTypes";
import { Pill, LivePill } from "../../components/primitives/Pill";
import { Segmented } from "../../components/primitives/Segmented";
import { Th, Td } from "../../components/primitives/Table";
import "./PitchByPitchV2.css";

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

const FILTER_ITEMS = ["All", "Runs", "K", "HR", "BB"];

type FilterKey = typeof FILTER_ITEMS[number];

function outcomeIcon(result: string | undefined): string {
  if (result == null) return "●";
  const r = result.toLowerCase();
  if (r.includes("home run")) return "HR";
  if (r.includes("triple")) return "3B";
  if (r.includes("double")) return "2B";
  if (r.includes("single")) return "1B";
  if (r.includes("walk") || r.includes("intentional")) return "BB";
  if (r.includes("strikeout") || r.includes("struck")) return "K";
  if (r.includes("ground")) return "GO";
  if (r.includes("flyout") || r.includes("fly out") || r.includes("pop")) return "F";
  if (r.includes("lineout") || r.includes("line out")) return "LO";
  return "●";
}

function outcomeColor(result: string | undefined): string {
  if (result == null) return "var(--color-text-faint)";
  const r = result.toLowerCase();
  if (r.includes("home run")) return "var(--color-accent)";
  if (r.includes("triple") || r.includes("double") || r.includes("single")) return "var(--color-positive)";
  if (r.includes("walk")) return "var(--color-info)";
  return "var(--color-text-faint)";
}

function halfLabel(half: "top" | "bottom", inning: number): string {
  return `${half === "top" ? "TOP" : "BOT"} ${inning}`;
}

function zoneCell(pitchX?: number, pitchZ?: number, szTop = 3.5, szBottom = 1.5): number {
  if (pitchX == null || pitchZ == null) return -1;
  const halfW = 0.835;
  const col = Math.min(2, Math.max(0, Math.floor(((pitchX + halfW) / (2 * halfW)) * 3)));
  const row = Math.min(2, Math.max(0, Math.floor(((szTop - pitchZ) / (szTop - szBottom)) * 3)));
  return row * 3 + col;
}

function matchesFilter(atBat: AtBatState, filter: FilterKey): boolean {
  if (filter === "All") return true;
  const r = (atBat.result ?? "").toLowerCase();
  if (filter === "Runs") return r.includes("score") || r.includes("rbi") || r.includes("home run");
  if (filter === "K") return r.includes("strikeout") || r.includes("struck");
  if (filter === "HR") return r.includes("home run");
  if (filter === "BB") return r.includes("walk");
  return true;
}

// Soft-green scoring chip — scoring is the positive event; rust is reserved for live/hot
function ScoringChip({ info }: { info: ScoringInfo }): ReactElement {
  return (
    <span className="pbpv2__scoring-chip">
      <span className="pbpv2__scoring-runs">
        {info.runs === 1 ? "1 run scores" : `${info.runs} runs score`}
      </span>
      <span className="pbpv2__scoring-divider" />
      <span className="pbpv2__scoring-score num">
        {info.awayAbbr} {info.awayScore} – {info.homeScore} {info.homeAbbr}
      </span>
    </span>
  );
}

interface ZoneChipProps {
  n: number;
}

function ZoneChip({ n }: ZoneChipProps): ReactElement {
  return (
    <div className="pbpv2__zone-chip">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className={`pbpv2__zone-cell${i === n ? " pbpv2__zone-cell--on" : ""}`}
        />
      ))}
    </div>
  );
}

// Team logo: real MLB logo where available, letter-mark fallback
function TeamMark({ logoUrl, abbr, size }: { logoUrl: string | null; abbr: string; size: number }): ReactElement {
  const [failed, setFailed] = useState(false);
  if (logoUrl != null && !failed) {
    return (
      <img
        src={logoUrl}
        alt={abbr}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, objectFit: "contain", display: "block", flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "var(--color-text-faint)", color: "#fff",
      display: "grid", placeItems: "center",
      fontFamily: "var(--font-sans)", fontSize: size * 0.5, fontWeight: 700,
      flexShrink: 0,
    }}>
      {abbr[0]}
    </div>
  );
}

export interface ScoringInfo {
  runs: number;
  awayScore: number;
  homeScore: number;
  awayAbbr: string;
  homeAbbr: string;
}

type TeamMeta = { logoUrl?: string | null };

interface PitchByPitchV2Props {
  completedAtBats: AtBatState[];
  currentAtBat: AtBatState | null;
  game?: GameViewDto | null;
  scoringByAtBat?: ReadonlyMap<number, ScoringInfo>;
}

export function PitchByPitchV2({ completedAtBats, currentAtBat, game, scoringByAtBat }: PitchByPitchV2Props): ReactElement {
  const [filterIdx, setFilterIdx] = useState(0);
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set());

  // Scroll the body to the top once, the first time a live PA arrives, so the
  // user sees the current at-bat rather than the beginning of the game.
  const bodyRef = useRef<HTMLDivElement>(null);
  const hasScrolledToLive = useRef(false);
  useEffect(() => {
    if (currentAtBat != null && !hasScrolledToLive.current) {
      hasScrolledToLive.current = true;
      bodyRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentAtBat]);

  const filter = FILTER_ITEMS[filterIdx] as FilterKey;

  function toggle(idx: number): void {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const awayMeta = game?.awayTeamMeta as TeamMeta | null | undefined;
  const homeMeta = game?.homeTeamMeta as TeamMeta | null | undefined;
  const awayLogoUrl = awayMeta?.logoUrl ?? null;
  const homeLogoUrl = homeMeta?.logoUrl ?? null;
  const awayAbbr = game?.awayAbbr ?? "AWY";
  const homeAbbr = game?.homeAbbr ?? "HME";

  // Newest-at-top: reverse completed list, live PA first
  const reversedCompleted = [...completedAtBats].reverse().filter((ab) => matchesFilter(ab, filter));
  const totalCount = completedAtBats.length + (currentAtBat != null ? 1 : 0);

  return (
    <div className="pbpv2">
      <div className="pbpv2__header">
        <div>
          <span className="pbpv2__title">Pitch by pitch</span>
          <span className="pbpv2__count">· {totalCount} at-bats</span>
        </div>
        <Segmented
          items={FILTER_ITEMS}
          active={filterIdx}
          onClick={setFilterIdx}
          size="sm"
        />
      </div>

      <div className="pbpv2__body" ref={bodyRef}>
        {totalCount === 0 && (
          <div className="pbpv2__empty">Waiting for updates…</div>
        )}

        {/* Live PA — always at top, always expanded */}
        {currentAtBat != null && (
          <div className="pbpv2__pa pbpv2__pa--live">
            <div className="pbpv2__pa-header" style={{ cursor: "default" }}>
              <div className="pbpv2__pa-meta">
                <span className="pbpv2__pa-inning">
                  {halfLabel(currentAtBat.half, currentAtBat.inning)}
                </span>
                <TeamMark
                  logoUrl={currentAtBat.half === "top" ? awayLogoUrl : homeLogoUrl}
                  abbr={currentAtBat.half === "top" ? awayAbbr : homeAbbr}
                  size={22}
                />
              </div>
              <div className="pbpv2__outcome" style={{ background: "var(--color-accent)" }}>
                ●
              </div>
              <div className="pbpv2__pa-text">
                <Link to={`/player/${currentAtBat.batterId}`} state={{ fromGame: game?.providerGameId }} className="pbpv2__batter-name player-link">{currentAtBat.batterName}</Link>
                {" "}
                <span className="pbpv2__pa-summary">· At bat</span>
                <LivePill label="LIVE" />
              </div>
              <span />
            </div>

            {currentAtBat.pitches.length > 0 && (
              <div className="pbpv2__pitches">
                <PitchTable atBat={currentAtBat} />
              </div>
            )}
          </div>
        )}

        {/* Completed PAs — newest first */}
        {reversedCompleted.map((atBat) => {
          const isOpen = expanded.has(atBat.atBatIndex);
          const icon = outcomeIcon(atBat.result);
          const color = outcomeColor(atBat.result);
          const hasPitches = atBat.pitches.length > 0;
          const scoring = scoringByAtBat?.get(atBat.atBatIndex) ?? null;

          return (
            <div key={atBat.atBatIndex} className="pbpv2__pa pbpv2__pa--normal">
              <div
                className="pbpv2__pa-header"
                onClick={hasPitches ? () => toggle(atBat.atBatIndex) : undefined}
                style={!hasPitches ? { cursor: "default" } : undefined}
              >
                <div className="pbpv2__pa-meta">
                  <span className="pbpv2__pa-inning">
                    {halfLabel(atBat.half, atBat.inning)}
                  </span>
                  <TeamMark
                    logoUrl={atBat.half === "top" ? awayLogoUrl : homeLogoUrl}
                    abbr={atBat.half === "top" ? awayAbbr : homeAbbr}
                    size={22}
                  />
                </div>

                <div className="pbpv2__outcome" style={{ background: color }}>
                  {icon}
                </div>

                <div className="pbpv2__pa-text">
                  <Link to={`/player/${atBat.batterId}`} state={{ fromGame: game?.providerGameId }} className="pbpv2__batter-name player-link">{atBat.batterName}</Link>
                  {atBat.result != null && (
                    <>
                      {" "}
                      <span className="pbpv2__pa-summary">
                        · {atBat.result}
                        {atBat.finalCount != null && (
                          <span className="num"> · {atBat.finalCount}</span>
                        )}
                      </span>
                    </>
                  )}
                  {scoring != null && <ScoringChip info={scoring} />}
                </div>

                <button
                  type="button"
                  className="pbpv2__chevron"
                  aria-label={isOpen ? "Collapse" : "Expand"}
                  onClick={(e) => { e.stopPropagation(); if (hasPitches) toggle(atBat.atBatIndex); }}
                >
                  {hasPitches ? (isOpen ? "▴" : "▾") : "—"}
                </button>
              </div>

              {isOpen && hasPitches && (
                <div className="pbpv2__pitches">
                  <PitchTable atBat={atBat} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pbpv2__footer-rule" />
    </div>
  );
}

function PitchTable({ atBat }: { atBat: AtBatState }): ReactElement {
  return (
    <table className="pbpv2__table">
      <thead>
        <tr>
          <Th align="left" style={{ paddingLeft: 12, paddingTop: 4, paddingBottom: 4 }}>#</Th>
          <Th align="left" style={{ paddingTop: 4, paddingBottom: 4 }}>Pitch</Th>
          <Th style={{ paddingTop: 4, paddingBottom: 4 }}>Velo</Th>
          <Th style={{ paddingTop: 4, paddingBottom: 4 }}>Zone</Th>
          <Th align="left" style={{ paddingTop: 4, paddingBottom: 4 }}>Result</Th>
          <Th style={{ paddingTop: 4, paddingBottom: 4 }}>Count</Th>
        </tr>
      </thead>
      <tbody>
        {atBat.pitches.map((p) => {
          const n = zoneCell(p.pitchX, p.pitchZ, atBat.strikeZoneTop, atBat.strikeZoneBottom);
          return (
            <tr
              key={p.seq}
              style={p.isLastPitch ? { background: "var(--color-accent-soft)" } : undefined}
            >
              <Td align="left" dim style={{ paddingLeft: 12 }}>{p.seq}</Td>
              <Td align="left" mono={false} style={{ fontWeight: 600 }}>
                <span className="pbpv2__pitch-type-cell">
                  <span
                    className="pbpv2__pitch-dot"
                    style={{ background: pitchColor(p.pitchTypeCode) }}
                  />
                  {p.pitchTypeName}
                </span>
              </Td>
              <Td>{p.speedMph != null ? p.speedMph.toFixed(1) : "—"}</Td>
              <Td><ZoneChip n={n} /></Td>
              <Td align="left" mono={false} hot={p.isLastPitch} style={{ fontWeight: p.isLastPitch ? 600 : 500 }}>
                {p.result || "—"}
              </Td>
              <Td dim>{p.count}</Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
