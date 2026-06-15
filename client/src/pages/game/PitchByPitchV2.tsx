import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import type { GameViewDto } from "@bitslinger21/baseball-realtime-client";
import type { AtBatState } from "../../components/AtBatCard/atBatTypes";
import { OrderSpot } from "../../components/primitives/OrderSpot";
import { LivePill } from "../../components/primitives/Pill";
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

function renderOrderSpot(orderByBatter: ReadonlyMap<number, number> | undefined, batterId: number): ReactElement | null {
  const slot = orderByBatter?.get(batterId);
  return slot != null ? <OrderSpot n={slot} /> : null;
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
  orderByBatter?: ReadonlyMap<number, number>;
}

export function PitchByPitchV2({ completedAtBats, currentAtBat, game, scoringByAtBat, orderByBatter }: PitchByPitchV2Props): ReactElement {
  const [filterIdx, setFilterIdx] = useState(0);
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set());

  // Auto-expand the first at-bat when a final game loads.
  // One-shot: only fires if the user hasn't already expanded anything.
  useEffect(() => {
    if (!isFinal || completedAtBats.length === 0) return;
    setExpanded((prev) => {
      if (prev.size > 0) return prev;
      return new Set([completedAtBats[0].atBatIndex]);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinal, completedAtBats.length > 0]);

  const isLive = game?.status === "live";
  const isFinal = game?.status === "final";
  const gameLoaded = game != null;

  // Live-follow state machine
  const [following, setFollowing] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const followingRef = useRef(true);            // mirror of `following` — safe to read in callbacks
  const prevScrollHeightRef = useRef(0);
  const hasInitializedRef = useRef(false);      // armed by compensation (live) or INIT (final)
  const isProgrammaticScrollRef = useRef(false); // suppress onScroll during code-driven scrollTop writes

  // INIT — final games only.
  // Newest-first list naturally starts at scrollTop=0, which shows the last inning at the top — correct.
  // Just arm hasInitializedRef and baseline prevScrollHeight; no scroll needed.
  // Live games skip this — followingRef=true + compensation keep the live edge visible.
  useLayoutEffect(() => {
    if (hasInitializedRef.current || !gameLoaded || !isFinal) return;
    if (completedAtBats.length === 0) return;
    const el = bodyRef.current;
    if (el == null) return;
    hasInitializedRef.current = true;
    prevScrollHeightRef.current = el.scrollHeight;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameLoaded, isFinal, completedAtBats.length]);

  // Compensation — live games only.
  // Runs on every content change without a one-shot gate so it covers the full hydration.
  // On the first run it arms hasInitializedRef and baselines prevScrollHeight.
  // On subsequent runs it applies the scrollHeight delta: followingRef=true → re-pin to 0;
  // followingRef=false → shift down to preserve the user's reading offset.
  // Sets isProgrammaticScroll before every scrollTop write so handleScroll ignores
  // the resulting scroll event and doesn't flip following to false.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el == null || !isLive) return;
    const newH = el.scrollHeight;
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
    } else if (prevScrollHeightRef.current > 0) {
      const delta = newH - prevScrollHeightRef.current;
      if (delta > 0) {
        isProgrammaticScrollRef.current = true;
        if (followingRef.current) {
          el.scrollTop = 0;
        } else {
          el.scrollTop += delta;
        }
      }
    }
    prevScrollHeightRef.current = newH;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedAtBats.length, currentAtBat?.pitches.length]);

  // Re-baseline prevScrollHeight when the filter changes so the next real content
  // change computes a correct delta.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el != null) prevScrollHeightRef.current = el.scrollHeight;
  }, [filterIdx]);

  // New-content counter: each time live content changes while the user is looking back,
  // increment so the pill can show "N new". Inert for final games.
  useEffect(() => {
    if (!hasInitializedRef.current || followingRef.current || !isLive) return;
    setNewCount((c) => c + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedAtBats.length, currentAtBat?.pitches.length]);

  function handleScroll(): void {
    const el = bodyRef.current;
    if (el == null || !isLive) return;
    if (isProgrammaticScrollRef.current) {
      isProgrammaticScrollRef.current = false;
      return;
    }
    const atTop = el.scrollTop <= 8;
    if (atTop === followingRef.current) return;
    followingRef.current = atTop;
    setFollowing(atTop);
    if (atTop) setNewCount(0);
  }

  function jumpToLive(): void {
    const el = bodyRef.current;
    if (el != null) {
      isProgrammaticScrollRef.current = true;
      el.scrollTop = 0;
    }
    followingRef.current = true;
    setFollowing(true);
    setNewCount(0);
  }

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

  // Live: newest-first (current PA pinned at top).
  // Final: chronological (first pitch at top; currentAtBat appended at bottom as last PA).
  const orderedCompleted = isFinal
    ? completedAtBats.filter((ab) => matchesFilter(ab, filter))
    : [...completedAtBats].reverse().filter((ab) => matchesFilter(ab, filter));
  const totalCount = completedAtBats.length + (currentAtBat != null ? 1 : 0);

  return (
    // Outer wrapper has no overflow so the sticky pill binds to the PAGE scroll,
    // not the card's internal overflow:hidden boundary.
    <div className="pbpv2-col">
      {/* Jump-to-live pill — position:sticky in the PAGE scroll context.
          Must live OUTSIDE .pbpv2 (overflow:hidden) so it isn't clipped to the
          640px internal frame; sticks below the app topbar when the page scrolls. */}
      {isLive && !following && currentAtBat != null && (
        <div className="pbpv2__jump-wrap">
          <button type="button" className="pbpv2__jump-pill" onClick={jumpToLive}>
            <span className="pbpv2__jump-arrow">↑</span>
            Jump to live
            {newCount > 0 && <span className="pbpv2__jump-badge num">{newCount} new</span>}
          </button>
        </div>
      )}

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

      <div className="pbpv2__body" ref={bodyRef} onScroll={handleScroll}>
        {totalCount === 0 && (
          <div className="pbpv2__empty">Waiting for updates…</div>
        )}

        {/* Live PA — pinned at top, always expanded, live games only */}
        {isLive && currentAtBat != null && (
          <div className="pbpv2__pa pbpv2__pa--live" data-ab-inning={currentAtBat.inning}>
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
                {renderOrderSpot(orderByBatter, currentAtBat.batterId)}
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

        {/* Completed PAs — chronological for final, newest-first for live */}
        {orderedCompleted.map((atBat) => {
          const isOpen = expanded.has(atBat.atBatIndex);
          const icon = outcomeIcon(atBat.result);
          const color = outcomeColor(atBat.result);
          const hasPitches = atBat.pitches.length > 0;
          const scoring = scoringByAtBat?.get(atBat.atBatIndex) ?? null;

          return (
            <div key={atBat.atBatIndex} className="pbpv2__pa pbpv2__pa--normal" data-ab-inning={atBat.inning}>
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
                  {renderOrderSpot(orderByBatter, atBat.batterId)}
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

        {/* Final game: last PA (currentAtBat) appended at the bottom as the game-ending play */}
        {isFinal && currentAtBat != null && matchesFilter(currentAtBat, filter) && (() => {
          const isOpen = expanded.has(currentAtBat.atBatIndex);
          const icon = outcomeIcon(currentAtBat.result);
          const color = outcomeColor(currentAtBat.result);
          const hasPitches = currentAtBat.pitches.length > 0;
          const scoring = scoringByAtBat?.get(currentAtBat.atBatIndex) ?? null;
          return (
            <div key={currentAtBat.atBatIndex} className="pbpv2__pa pbpv2__pa--normal" data-ab-inning={currentAtBat.inning}>
              <div
                className="pbpv2__pa-header"
                onClick={hasPitches ? () => toggle(currentAtBat.atBatIndex) : undefined}
                style={!hasPitches ? { cursor: "default" } : undefined}
              >
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
                <div className="pbpv2__outcome" style={{ background: color }}>
                  {icon}
                </div>
                <div className="pbpv2__pa-text">
                  {renderOrderSpot(orderByBatter, currentAtBat.batterId)}
                  <Link to={`/player/${currentAtBat.batterId}`} state={{ fromGame: game?.providerGameId }} className="pbpv2__batter-name player-link">{currentAtBat.batterName}</Link>
                  {currentAtBat.result != null && (
                    <>
                      {" "}
                      <span className="pbpv2__pa-summary">
                        · {currentAtBat.result}
                        {currentAtBat.finalCount != null && (
                          <span className="num"> · {currentAtBat.finalCount}</span>
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
                  onClick={(e) => { e.stopPropagation(); if (hasPitches) toggle(currentAtBat.atBatIndex); }}
                >
                  {hasPitches ? (isOpen ? "▴" : "▾") : "—"}
                </button>
              </div>
              {isOpen && hasPitches && (
                <div className="pbpv2__pitches">
                  <PitchTable atBat={currentAtBat} />
                </div>
              )}
            </div>
          );
        })()}
      </div>

      <div className="pbpv2__footer-rule" />
    </div>
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
