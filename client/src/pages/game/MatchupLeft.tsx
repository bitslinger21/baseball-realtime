import { useState, useRef, useEffect, useCallback, type ReactElement } from "react";
import { Link } from "react-router-dom";
import type { GameViewDto } from "@bitslinger21/baseball-realtime-client";
import type { PlayUpdate } from "../../realtime/types";
import type { AtBatState } from "../../components/AtBatCard/atBatTypes";
import type { BatterInfo } from "../../components/AtBatCard/atBatTypes";
import { Bases } from "../../components/primitives/Bases";
import { Headshot } from "../../components/primitives/Headshot";
import { OrderSpot } from "../../components/primitives/OrderSpot";
import { Pips } from "../../components/primitives/Pips";
import { ScorebookCell } from "../../components/primitives/ScorebookCell";
import { StrikeZone } from "../../components/primitives/StrikeZone";
import type { StrikeZoneDot } from "../../components/primitives/StrikeZone";
import "./MatchupLeft.css";

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

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function pitchToPercent(
  pitchX: number,
  pitchZ: number,
  szTop: number,
  szBottom: number,
): { x: number; y: number } {
  const halfPlate = 0.8333;
  const x = 50 + (pitchX / halfPlate) * 27;
  const zRange = szTop - szBottom;
  const y = zRange > 0 ? 12 + ((szTop - pitchZ) / zRange) * 54 : 39;
  return { x: clamp(x, 6, 94), y: clamp(y, 6, 94) };
}

function initials(name: string): string {
  return name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

interface PAData {
  resultCode: string;
  basesReached: number;
  scored: boolean;
  inning: number;
}

// The backend normalises all MLB events into a short Pascal-case enum before
// they hit the wire: 'Single', 'Double', 'Triple', 'HomeRun', 'Walk',
// 'Strikeout', 'Out', 'HBP', 'Error', 'Other'.  Check those exact forms first,
// then keep substring checks as fallbacks for any raw pass-through strings.
function parsePA(result: string | undefined, inning: number, scorebookCode?: string): PAData {
  const base = (resultCode: string, basesReached: number, scored: boolean): PAData =>
    ({ resultCode, basesReached, scored, inning });
  if (result == null) return base("●", 0, false);
  const r = result.toLowerCase().trim();
  if (r === "single"   || r.includes("single"))                             return base("1B",  1, false);
  if (r === "double"   || r.includes("double"))                             return base("2B",  2, false);
  if (r === "triple"   || r.includes("triple"))                             return base("3B",  3, false);
  if (r === "homerun"  || r.includes("home run") || r.includes("homerun"))  return base("HR",  4, true);
  if (r.includes("intentional walk"))                                       return base("IBB", 1, false);
  if (r === "walk"     || r.includes("walk"))                               return base("BB",  1, false);
  if (r === "hbp"      || r.includes("hit by pitch"))                       return base("HBP", 1, false);
  if (r === "error"    || r.includes("error"))                              return base("E",   1, false);
  if (r.includes("fielder"))                                                return base("FC",  1, false);
  // For strikeouts and batted-ball outs, use the enriched scorebookCode from the server when
  // available (Tier A/B), else fall back to the result-only code (Tier C / generic K).
  if (r === "strikeout" || r.includes("strikeout") || r.includes("struck out"))
    return base(scorebookCode ?? "K", 0, false);
  // 'Out' is the backend's catch-all for every batted-ball out (groundout,
  // flyout, lineout, etc.); must sit after all more-specific checks.
  if (r === "out" || r.includes("out"))
    return base(scorebookCode ?? "OUT", 0, false);
  return base("●", 0, false);
}

interface MatchupLeftProps {
  game: GameViewDto;
  latest: PlayUpdate | null;
  currentAtBat: AtBatState | null;
  completedAtBats: AtBatState[];
  batterInfo: BatterInfo | null;
  orderByBatter?: ReadonlyMap<number, number>;
  lineupsOpen?: boolean;
  onToggleLineups?: () => void;
  allCompletedAtBats?: AtBatState[];
  headAtBatIndex?: number | null;
  onSeekToBat?: (atBatIndex: number) => void;
}

type TeamMeta = { primaryColorHex?: string | null; logoUrl?: string | null };

export function MatchupLeft({
  game,
  latest,
  currentAtBat,
  completedAtBats,
  batterInfo,
  orderByBatter,
  lineupsOpen = false,
  onToggleLineups,
  allCompletedAtBats,
  headAtBatIndex,
  onSeekToBat,
}: MatchupLeftProps): ReactElement {
  // Scorebook row selection — null means "live cell selected" (default)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // At-bats scroll row: hide scrollbar, show ‹ › chevrons instead
  const atbatsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const syncChevrons = useCallback(() => {
    const el = atbatsScrollRef.current;
    if (el == null) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  // Live mode: scroll to end when a new cell is added.
  // Recomputed from raw props so this stays above the early return (Rules of Hooks).
  const liveCellCount = allCompletedAtBats == null
    ? completedAtBats.filter((ab) => ab.batterId === latest?.batterId).length
      + (currentAtBat != null ? 1 : 0)
    : 0;
  // totalCellCount covers both modes so the listener effect can re-run when cells first appear.
  const totalCellCount = allCompletedAtBats == null
    ? liveCellCount
    : allCompletedAtBats.filter((ab) => ab.batterId === latest?.batterId).length;

  useEffect(() => {
    const el = atbatsScrollRef.current;
    if (el == null) return;
    el.addEventListener("scroll",    syncChevrons, { passive: true });
    el.addEventListener("scrollend", syncChevrons, { passive: true });
    syncChevrons();
    return () => {
      el.removeEventListener("scroll",    syncChevrons);
      el.removeEventListener("scrollend", syncChevrons);
    };
  // totalCellCount re-runs this effect when cells first appear so syncChevrons
  // sees the real scrollWidth (at mount the scroll div doesn't exist yet).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncChevrons, totalCellCount]);
  useEffect(() => {
    if (allCompletedAtBats != null) return;
    const el = atbatsScrollRef.current;
    if (el == null) return;
    el.scrollLeft = el.scrollWidth;
    syncChevrons();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCellCount]);

  // Scout mode: center the active cell when play head moves.
  useEffect(() => {
    if (allCompletedAtBats == null || headAtBatIndex == null || latest?.batterId == null) return;
    const el = atbatsScrollRef.current;
    if (el == null) return;
    const scoutABs = allCompletedAtBats.filter((ab) => ab.batterId === latest.batterId);
    const activeIdx = scoutABs.findIndex((ab) => ab.atBatIndex === headAtBatIndex);
    if (activeIdx < 0) return;
    const CELL_W = 50;
    el.scrollLeft = Math.max(0, activeIdx * CELL_W - el.clientWidth / 2 + 22);
    syncChevrons();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headAtBatIndex]);

  if (latest == null) {
    return (
      <div className="card matchup-left">
        <div className="matchup-left__empty">Waiting for updates…</div>
      </div>
    );
  }

  const { inning, half, balls, strikes, outs, bases, batterName, pitcherName } = latest;

  // Team meta (SDK types it as `object | null`; cast locally)
  const awayMeta = game.awayTeamMeta as TeamMeta | null;
  const homeMeta = game.homeTeamMeta as TeamMeta | null;
  const battingMeta = half === "top" ? awayMeta : homeMeta;
  const battingAbbr = half === "top" ? game.awayAbbr : game.homeAbbr;
  const batterTeamColor = battingMeta?.primaryColorHex ?? "var(--color-text-faint)";

  // Completed ABs for this batter — keep full AtBatState for zone replay
  const batterId = latest.batterId;
  const batterCompletedABs: AtBatState[] = batterId != null
    ? completedAtBats.filter((ab) => ab.batterId === batterId)
    : [];
  const batterPAs: PAData[] = batterCompletedABs.map((ab) => parsePA(ab.result, ab.inning, ab.scorebookCode));

  // Resolve which AB to display in the zone: selected past AB, or current live AB
  const liveIdx = batterCompletedABs.length;
  const effectiveIdx = selectedIdx != null && selectedIdx < liveIdx ? selectedIdx : liveIdx;
  const zoneAtBat = effectiveIdx < liveIdx ? (batterCompletedABs[effectiveIdx] ?? currentAtBat) : currentAtBat;

  // Build zone dots from the displayed at-bat
  const dots: StrikeZoneDot[] = [];
  if (zoneAtBat != null) {
    const szTop = zoneAtBat.strikeZoneTop ?? 3.5;
    const szBottom = zoneAtBat.strikeZoneBottom ?? 1.5;
    for (const p of zoneAtBat.pitches) {
      if (p.pitchX == null || p.pitchZ == null) continue;
      const { x, y } = pitchToPercent(p.pitchX, p.pitchZ, szTop, szBottom);
      dots.push({ x, y, label: p.seq, color: pitchColor(p.pitchTypeCode) });
    }
  }

  // Legend: unique pitch types seen in the displayed AB
  const seenTypes = new Map<string, string>();
  if (zoneAtBat != null) {
    for (const p of zoneAtBat.pitches) {
      if (!seenTypes.has(p.pitchTypeCode)) seenTypes.set(p.pitchTypeCode, p.pitchTypeName);
    }
  }


  // Batter today line
  const gameAB = currentAtBat?.gameAB ?? 0;
  const gameH = currentAtBat?.gameH ?? 0;

  // Slash line from season info
  const avg = batterInfo?.avg ?? "—";
  const obp = batterInfo?.obp ?? "—";
  const slg = batterInfo?.slg ?? "—";

  // Batting-order slot for the current batter
  const orderSlot = batterId != null ? (orderByBatter?.get(batterId) ?? null) : null;

  // Scout mode: full game's ABs for this batter (includes future), for seek-click scorebook
  const scoutBatterABs: AtBatState[] | null = (allCompletedAtBats != null && batterId != null)
    ? allCompletedAtBats.filter((ab) => ab.batterId === batterId)
    : null;

  const showAtBats = batterPAs.length > 0 || currentAtBat != null || (scoutBatterABs != null && scoutBatterABs.length > 0);

  return (
    <div className="card matchup-left">
      {/* Light play-state eyebrow — inning · bases · B/S/O pips | Lineups ▾ (right) */}
      <div className="matchup-left__eyebrow">
        <div className="matchup-left__eyebrow-left">
          <span className="matchup-left__inning num">
            {half === "top" ? "▲" : "▼"} {inning}
          </span>
          <Bases
            on={[bases.on1, bases.on2, bases.on3]}
            size={26}
            fill="var(--color-accent)"
          />
          <div className="matchup-left__count-group">
            {(
              [
                { l: "BALLS", count: balls, total: 3, color: "var(--color-info)" },
                { l: "STRIKES", count: strikes, total: 2, color: "var(--color-text)" },
                { l: "OUTS", count: outs, total: 2, color: "var(--color-accent)" },
              ] as const
            ).map((p) => (
              <span key={p.l} className="matchup-left__count-item">
                <span className="matchup-left__count-label">{p.l}</span>
                <Pips count={p.count} total={p.total} size={9} gap={5} color={p.color} emptyColor="var(--color-border-strong)" />
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          className={`matchup-left__lineups-btn${lineupsOpen ? " matchup-left__lineups-btn--open" : ""}`}
          onClick={onToggleLineups}
        >
          Lineups <span className="matchup-left__lineups-arrow">{lineupsOpen ? "▸" : "▾"}</span>
        </button>
      </div>

      {/* Zone + batter grid */}
      <div className="matchup-left__grid">
        {/* Zone column */}
        <div className="matchup-left__zone-col">
          <StrikeZone size={240} dots={dots} />
          {seenTypes.size > 0 && (
            <div className="matchup-left__legend">
              {Array.from(seenTypes).map(([code, name]) => (
                <span key={code} className="matchup-left__legend-item" title={name}>
                  <span
                    className="matchup-left__legend-dot"
                    style={{ background: pitchColor(code) }}
                  />
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Batter column */}
        <div className="matchup-left__batter-col">
          <span className="matchup-left__at-bat-eyebrow">At bat · {battingAbbr}</span>

          <div className="matchup-left__batter-identity">
            <Headshot
              mlbId={latest.batterId ?? null}
              initials={initials(batterName ?? "—")}
              teamColor={batterTeamColor}
              size={68}
            />
            <div className="matchup-left__batter-text">
              <div className="matchup-left__batter-name-row">
                {orderSlot != null && <OrderSpot n={orderSlot} />}
                {latest.batterId != null
                  ? <Link to={`/player/${latest.batterId}`} state={{ fromGame: game.providerGameId }} className="matchup-left__batter-name player-link">{batterName ?? "—"}</Link>
                  : <span className="matchup-left__batter-name">{batterName ?? "—"}</span>
                }
              </div>
              {latest.batterAvg != null && (
                <span className="matchup-left__batter-meta">
                  .{String(Math.round(latest.batterAvg * 1000)).padStart(3, "0")} AVG
                </span>
              )}
              {batterInfo != null && (
                <span className="matchup-left__slash">
                  {avg}
                  <span className="matchup-left__slash-sep"> / </span>
                  {obp}
                  <span className="matchup-left__slash-sep"> / </span>
                  {slg}
                </span>
              )}
            </div>
          </div>

          <div className="matchup-left__stat-rows">
            {/* Today: summary only — per-AB detail lives in the diamonds below */}
            <div className="matchup-left__stat-row">
              <span className="matchup-left__stat-row-label">Today</span>
              <span className="matchup-left__stat-row-value">
                {gameH}-for-{gameAB}
              </span>
            </div>

            {/* At-bats scorebook row */}
            {showAtBats && (
              <div className="matchup-left__atbats">
                <span className="matchup-left__atbats-label">At-bats</span>
                <div className="matchup-left__atbats-wrap">
                  {canScrollLeft && (
                    <button
                      type="button"
                      className="matchup-left__atbats-chevron matchup-left__atbats-chevron--left"
                      aria-label="Scroll left"
                      onClick={() => {
                        const el = atbatsScrollRef.current;
                        if (!el) return;
                        el.scrollLeft = 0;
                        syncChevrons();
                      }}
                    >‹</button>
                  )}
                <div className="matchup-left__atbats-scroll" ref={atbatsScrollRef}>
                  {scoutBatterABs != null ? (
                    scoutBatterABs.map((ab) => {
                      const isFuture = headAtBatIndex != null && ab.atBatIndex > headAtBatIndex;
                      const isCurrent = headAtBatIndex != null && ab.atBatIndex === headAtBatIndex;
                      const pa = parsePA(ab.result, ab.inning, ab.scorebookCode);
                      return (
                        <button
                          key={ab.atBatIndex}
                          type="button"
                          className="matchup-left__scorebook-btn"
                          onClick={() => onSeekToBat?.(ab.atBatIndex)}
                          title={`Inning ${ab.inning} — click to seek`}
                        >
                          <ScorebookCell
                            code={pa.resultCode}
                            reachedOnPA={pa.basesReached}
                            finalBase={pa.basesReached}
                            scored={!isFuture && pa.scored}
                            inning={pa.inning}
                            width={44}
                            muted={isFuture}
                            active={isCurrent}
                          />
                        </button>
                      );
                    })
                  ) : (
                    <>
                      {batterPAs.map((pa, i) => (
                        <button
                          key={i}
                          type="button"
                          className="matchup-left__scorebook-btn"
                          onClick={() => setSelectedIdx(i)}
                          title={`Inning ${pa.inning}`}
                        >
                          <ScorebookCell
                            code={pa.resultCode}
                            reachedOnPA={pa.basesReached}
                            finalBase={pa.basesReached}
                            scored={pa.scored}
                            inning={pa.inning}
                            width={44}
                            active={effectiveIdx === i}
                          />
                        </button>
                      ))}
                      {currentAtBat != null && (
                        <button
                          type="button"
                          className="matchup-left__scorebook-btn"
                          onClick={() => setSelectedIdx(null)}
                          title="Current at-bat"
                        >
                          <ScorebookCell
                            live
                            active={selectedIdx == null}
                            inning={currentAtBat.inning}
                            width={44}
                          />
                        </button>
                      )}
                    </>
                  )}
                </div>
                  {canScrollRight && (
                    <button
                      type="button"
                      className="matchup-left__atbats-chevron matchup-left__atbats-chevron--right"
                      aria-label="Scroll right"
                      onClick={() => {
                        const el = atbatsScrollRef.current;
                        if (!el) return;
                        el.scrollLeft = el.scrollWidth;
                        syncChevrons();
                      }}
                    >›</button>
                  )}
                </div>
              </div>
            )}

            {/* vs [pitcher] */}
            {pitcherName != null && (
              <div className="matchup-left__stat-row">
                <span className="matchup-left__stat-row-label">
                  vs {pitcherName.split(" ").slice(-1)[0]}
                </span>
                <span className="matchup-left__stat-row-value matchup-left__stat-row-value--faint">
                  —
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
