import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import type { GameViewDto } from "@bitslinger21/baseball-realtime-client";
import type { AtBatState } from "../../components/AtBatCard/atBatTypes";
import { OrderSpot } from "../../components/primitives/OrderSpot";
import { LivePill } from "../../components/primitives/Pill";
import { ScorebookCell } from "../../components/primitives/ScorebookCell";
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

function playResultToCode(result: string | undefined, scorebookCode?: string): string {
  switch (result) {
    case 'HomeRun': return 'HR';
    case 'Triple': return '3B';
    case 'Double': return '2B';
    case 'Single': return '1B';
    case 'Walk': return 'BB';
    case 'IntentionalWalk': return 'IBB';
    case 'HitByPitch': return 'HBP';
    case 'Strikeout': return 'K';
    case 'SacFly': return 'SF';
    case 'SacBunt': return 'SH';
    case 'Error': return 'E';
    case 'Groundout': case 'Flyout': case 'Lineout': case 'PopOut':
    case 'FieldersChoice': case 'DoublePlay': case 'TriplePlay': case 'Out':
      return scorebookCode ?? 'OUT';
    default: return result != null ? (scorebookCode ?? '●') : '●';
  }
}


function playResultToLabel(result: string | undefined): string {
  switch (result) {
    case 'HomeRun': return 'Home run';
    case 'Triple': return 'Triple';
    case 'Double': return 'Double';
    case 'Single': return 'Single';
    case 'Walk': return 'Walk';
    case 'IntentionalWalk': return 'Intentional walk';
    case 'HitByPitch': return 'Hit by pitch';
    case 'Strikeout': return 'Strikeout';
    case 'Groundout': return 'Groundout';
    case 'Flyout': return 'Flyout';
    case 'Lineout': return 'Lineout';
    case 'PopOut': return 'Pop out';
    case 'FieldersChoice': return "Fielder's choice";
    case 'DoublePlay': return 'Double play';
    case 'TriplePlay': return 'Triple play';
    case 'SacFly': return 'Sacrifice fly';
    case 'SacBunt': return 'Sacrifice bunt';
    case 'Error': return 'Reached on error';
    default: return result ?? '';
  }
}

function playResultToCellProps(result: string | undefined, scorebookCode?: string): {
  code: string;
  kind: "hit" | "out" | "walk" | "hbp";
  reachedOnPA: number;
  finalBase: number;
  scored?: true;
} {
  switch (result) {
    case 'HomeRun':        return { code: 'HR',  kind: 'hit',  reachedOnPA: 4, finalBase: 4, scored: true };
    case 'Triple':         return { code: '3B',  kind: 'hit',  reachedOnPA: 3, finalBase: 3 };
    case 'Double':         return { code: '2B',  kind: 'hit',  reachedOnPA: 2, finalBase: 2 };
    case 'Single':         return { code: '1B',  kind: 'hit',  reachedOnPA: 1, finalBase: 1 };
    case 'Walk':           return { code: 'BB',  kind: 'walk', reachedOnPA: 1, finalBase: 1 };
    case 'IntentionalWalk':return { code: 'IBB', kind: 'walk', reachedOnPA: 1, finalBase: 1 };
    case 'HitByPitch':     return { code: 'HBP', kind: 'hbp',  reachedOnPA: 1, finalBase: 1 };
    case 'FieldersChoice': return { code: 'FC',  kind: 'out',  reachedOnPA: 1, finalBase: 1 };
    case 'Error':          return { code: 'E',   kind: 'out',  reachedOnPA: 1, finalBase: 1 };
    default: {
      const code = playResultToCode(result, scorebookCode);
      return { code, kind: 'out', reachedOnPA: 0, finalBase: 0 };
    }
  }
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

function matchesFilter(atBat: AtBatState, filter: FilterKey, scoringByAtBat?: ReadonlyMap<number, ScoringInfo>): boolean {
  if (filter === "All") return true;
  const r = atBat.result;
  if (filter === "Runs") return r === 'HomeRun' || (scoringByAtBat?.has(atBat.atBatIndex) ?? false);
  if (filter === "K") return r === 'Strikeout';
  if (filter === "HR") return r === 'HomeRun';
  if (filter === "BB") return r === 'Walk' || r === 'IntentionalWalk';
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
  isReplayMode?: boolean;
  scoutMode?: boolean;
  allCompletedAtBats?: AtBatState[];
  headAtBatIndex?: number | null;
  onSeek?: (atBatIndex: number) => void;
}

export function PitchByPitchV2({ completedAtBats, currentAtBat, game, scoringByAtBat, orderByBatter, isReplayMode = false, scoutMode = false, allCompletedAtBats, headAtBatIndex, onSeek }: PitchByPitchV2Props): ReactElement {
  const [filterIdx, setFilterIdx] = useState(0);
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set());


  const isLive = game?.status === "live";
  // Scout mode handles its own scroll; live-follow is live-games only.
  const isStreaming = isLive || (isReplayMode && !scoutMode);
  // Canvas layout: live and replay-mode games (including final-game scout replay).
  // scoutMode is intentionally not excluded — GamePage sets both for final games.
  const useCanvasLayout = isLive || isReplayMode;

  // Old-layout live-follow state machine (inert in canvas mode — bodyRef.current is null)
  const [following, setFollowing] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const followingRef = useRef(true);
  const prevScrollHeightRef = useRef(0);
  const hasInitializedRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  // Row refs for Scout mode auto-scroll (keyed by atBatIndex)
  const rowRefs = useRef<Map<number, HTMLElement>>(new Map());

  // Canvas layout: pitch-region ref — auto-pin to bottom on new pitches
  const canvasPitchesRef = useRef<HTMLDivElement>(null);
  // Scout Upcoming zone ref — auto-scrolled to bottom so next-up AB is visible
  // Wheel-driven play head: frame ref + cooldown + stable step callback
  const pbpv2FrameRef = useRef<HTMLDivElement>(null);
  const wheelCooldownRef = useRef(false);
  // Updated each render so the listener always sees the latest arrays + onSeek
  const wheelStepRef = useRef<(down: boolean) => void>(() => {});

  // Old-layout scroll compensation. Inert in canvas mode since bodyRef.current == null.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el == null || !isStreaming) return;
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

  // Re-baseline prevScrollHeight when the filter changes.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el != null) prevScrollHeightRef.current = el.scrollHeight;
  }, [filterIdx]);

  // Scout mode: keep the head's AB centered in the feed.
  useLayoutEffect(() => {
    if (!scoutMode || headAtBatIndex == null) return;
    const el = bodyRef.current;
    const row = rowRefs.current.get(headAtBatIndex);
    if (el == null || row == null) return;
    const target = row.offsetTop - el.clientHeight / 2 + row.clientHeight / 2;
    el.scrollTop = Math.max(0, target);
  }, [scoutMode, headAtBatIndex]);

  // New-content counter for old layout jump pill.
  useEffect(() => {
    if (!hasInitializedRef.current || followingRef.current || !isStreaming) return;
    setNewCount((c) => c + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedAtBats.length, currentAtBat?.pitches.length]);

  // Canvas live mode: auto-scroll pitch region to bottom when new pitches arrive.
  useLayoutEffect(() => {
    if (!useCanvasLayout || scoutMode) return;
    const el = canvasPitchesRef.current;
    if (el == null) return;
    el.scrollTop = el.scrollHeight;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAtBat?.pitches.length, useCanvasLayout, scoutMode]);

  // Canvas scout/replay mode: reset pitch scroll to top when head moves to a new AB.
  useLayoutEffect(() => {
    if (!useCanvasLayout || !scoutMode) return;
    const el = canvasPitchesRef.current;
    if (el == null) return;
    el.scrollTop = 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headAtBatIndex, useCanvasLayout, scoutMode]);

  // Scout Earlier zone ref — for scroll-into-view transition on batter change.
  const scoutEarlierRef = useRef<HTMLDivElement>(null);
  const scoutEarlierInitRef = useRef(false);


  // Scout Earlier: when head advances, jump one row down then smooth-scroll to top
  // so the newly completed AB scrolls into view from below the header.
  // Skip the animation on first mount — just snap to top instantly.
  useLayoutEffect(() => {
    if (!scoutMode || headAtBatIndex == null) return;
    const el = scoutEarlierRef.current;
    if (el == null) return;
    if (!scoutEarlierInitRef.current) {
      scoutEarlierInitRef.current = true;
      el.scrollTop = 0;
    } else {
      const ROW_H = 44;
      el.scrollTop = ROW_H;
      requestAnimationFrame(() => { el.scrollTo({ top: 0, behavior: "smooth" }); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headAtBatIndex, scoutMode]);

  function handleScroll(): void {
    const el = bodyRef.current;
    if (el == null || !isStreaming) return;
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

  // Newest-first feed. Scout mode shows all ABs (no filter); standard mode filters.
  const orderedCompleted = scoutMode
    ? [...(allCompletedAtBats ?? completedAtBats)].reverse()
    : [...completedAtBats].reverse().filter((ab) => matchesFilter(ab, filter, scoringByAtBat));

  // Live canvas earlier ABs (with filter)
  const canvasEarlierABs = [...completedAtBats]
    .reverse()
    .filter((ab) => matchesFilter(ab, filter, scoringByAtBat));

  // Scout three-zone data — future (Upcoming) and past (Earlier) split around the head
  const scoutAllABs = allCompletedAtBats ?? completedAtBats;
  const scoutUpcoming = (scoutMode && headAtBatIndex != null)
    ? [...scoutAllABs].filter((ab) => ab.atBatIndex > headAtBatIndex)
    : [];
  const scoutEarlier = scoutMode
    ? [...scoutAllABs].filter((ab) => headAtBatIndex == null || ab.atBatIndex < headAtBatIndex).reverse()
    : [];

  const totalCount = scoutMode
    ? (allCompletedAtBats ?? completedAtBats).length
    : completedAtBats.length + (currentAtBat != null ? 1 : 0);

  // Keep the step callback current every render so the wheel listener never goes stale.
  wheelStepRef.current = (down: boolean) => {
    if (scoutMode) {
      const ab = down ? scoutEarlier[0] : scoutUpcoming[0];
      if (ab != null) onSeek?.(ab.atBatIndex);
    } else if (down) {
      const ab = canvasEarlierABs[0];
      if (ab != null) onSeek?.(ab.atBatIndex);
    }
  };

  // Attach a non-passive wheel listener to the feed frame. Lets the pitch region
  // scroll internally first; only steps the head once the region hits its edge.
  useEffect(() => {
    if (!useCanvasLayout) return;
    const frame = pbpv2FrameRef.current;
    if (frame == null) return;
    const DEADZONE = 3;
    const COOLDOWN_MS = 300;

    function onWheel(e: WheelEvent): void {
      e.preventDefault();
      if (wheelCooldownRef.current) return;
      const dy = e.deltaY;
      if (Math.abs(dy) < DEADZONE) return;
      const down = dy > 0;
      const pitchEl = canvasPitchesRef.current;
      if (pitchEl != null) {
        if (down && pitchEl.scrollHeight - pitchEl.scrollTop > pitchEl.clientHeight + 2) {
          pitchEl.scrollTop += dy;
          return;
        }
        if (!down && pitchEl.scrollTop > 2) {
          pitchEl.scrollTop += dy;
          return;
        }
      }
      wheelCooldownRef.current = true;
      setTimeout(() => { wheelCooldownRef.current = false; }, COOLDOWN_MS);
      wheelStepRef.current(down);
    }

    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, [useCanvasLayout]);

  // Shared collapsed-row renderer — used in both canvas "Earlier" zone and old layout.
  function renderCompletedRow(atBat: AtBatState): ReactElement {
    const isOpen = expanded.has(atBat.atBatIndex);
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

          <ScorebookCell
            codeIn
            {...playResultToCellProps(atBat.result, atBat.scorebookCode)}
            width={40}
          />

          <div className="pbpv2__pa-text">
            {renderOrderSpot(orderByBatter, atBat.batterId)}
            <Link to={`/player/${atBat.batterId}`} state={{ fromGame: game?.providerGameId }} className="pbpv2__batter-name player-link">{atBat.batterName}</Link>
            {atBat.result != null && (
              <>
                {" "}
                <span className="pbpv2__pa-summary">
                  · {playResultToLabel(atBat.result)}
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
  }

  return (
    // Outer wrapper has no overflow so the sticky pill binds to the PAGE scroll.
    <div className="pbpv2-col">
      {/* Jump-to-live pill — only relevant for the old single-scroll layout */}
      {isLive && !following && currentAtBat != null && !useCanvasLayout && (
        <div className="pbpv2__jump-wrap">
          <button type="button" className="pbpv2__jump-pill" onClick={jumpToLive}>
            <span className="pbpv2__jump-arrow">↑</span>
            Jump to live
            {newCount > 0 && <span className="pbpv2__jump-badge num">{newCount} new</span>}
          </button>
        </div>
      )}

    <div className="pbpv2" ref={pbpv2FrameRef}>
      <div className="pbpv2__header">
        <div>
          <span className="pbpv2__title">Pitch by pitch</span>
          <span className="pbpv2__count">· {totalCount} at-bats</span>
        </div>
        {!scoutMode && (
          <Segmented
            items={FILTER_ITEMS}
            active={filterIdx}
            onClick={setFilterIdx}
            size="sm"
          />
        )}
      </div>

      {useCanvasLayout ? (
        scoutMode ? (
          /* Scout: three-zone layout — Upcoming ▸ Canvas ▸ Earlier */
          <>
            {/* Zone 1: Upcoming — future ABs, always 85px, smooth-scrolled to bottom */}
            <div className="pbpv2__upcoming">
              <div className="pbpv2__earlier-header">
                Upcoming
                {scoutUpcoming.length > 0 && <span className="pbpv2__count"> · {scoutUpcoming.length}</span>}
              </div>
              {scoutUpcoming.map((atBat) => (
                <div key={atBat.atBatIndex} className="pbpv2__pa pbpv2__pa--future" data-ab-inning={atBat.inning}>
                  <div className="pbpv2__pa-header" onClick={() => onSeek?.(atBat.atBatIndex)} style={{ cursor: "pointer" }}>
                    <div className="pbpv2__pa-meta">
                      <span className="pbpv2__pa-inning">{halfLabel(atBat.half, atBat.inning)}</span>
                      <TeamMark logoUrl={atBat.half === "top" ? awayLogoUrl : homeLogoUrl} abbr={atBat.half === "top" ? awayAbbr : homeAbbr} size={22} />
                    </div>
                    <ScorebookCell muted width={40} />
                    <div className="pbpv2__pa-text">
                      {renderOrderSpot(orderByBatter, atBat.batterId)}
                      <Link to={`/player/${atBat.batterId}`} state={{ fromGame: game?.providerGameId }} className="pbpv2__batter-name player-link">{atBat.batterName}</Link>
                    </div>
                    <span />
                  </div>
                </div>
              ))}
            </div>

            {/* Zone 2: Current-AB canvas — ink border, ▸ play-head marker */}
            <div className="pbpv2__canvas pbpv2__canvas--scout">
              {currentAtBat != null ? (
                <>
                  <div key={`batter-${currentAtBat.atBatIndex}`} className="pbpv2__canvas-batter pbpv2__canvas-batter--scout">
                    <div className="pbpv2__pa-header" style={{ cursor: "default" }}>
                      <div className="pbpv2__pa-meta">
                        <span className="pbpv2__pa-inning">{halfLabel(currentAtBat.half, currentAtBat.inning)}</span>
                        <TeamMark logoUrl={currentAtBat.half === "top" ? awayLogoUrl : homeLogoUrl} abbr={currentAtBat.half === "top" ? awayAbbr : homeAbbr} size={22} />
                      </div>
                      <span />
                      <div className="pbpv2__pa-text">
                        {renderOrderSpot(orderByBatter, currentAtBat.batterId)}
                        <Link to={`/player/${currentAtBat.batterId}`} state={{ fromGame: game?.providerGameId }} className="pbpv2__batter-name player-link">{currentAtBat.batterName}</Link>
                        {" "}
                        <span className="pbpv2__pa-summary">· At bat</span>
                      </div>
                      <span />
                    </div>
                  </div>
                  <div key={`pitches-${currentAtBat.atBatIndex}`} className="pbpv2__canvas-pitches" ref={canvasPitchesRef}>
                    {currentAtBat.pitches.length > 0 ? (
                      <div className="pbpv2__pitches"><PitchTable atBat={currentAtBat} /></div>
                    ) : (
                      <div className="pbpv2__empty">Select a pitch…</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="pbpv2__empty">Waiting for updates…</div>
              )}
            </div>

            {/* Zone 3: Earlier at-bats — always present; scroll-reveals new entry on batter change */}
            <div className="pbpv2__earlier pbpv2__earlier--scout" ref={scoutEarlierRef}>
              <div className="pbpv2__earlier-header">
                Earlier at-bats
                {scoutEarlier.length > 0 && <span className="pbpv2__count"> · {scoutEarlier.length}</span>}
              </div>
              {scoutEarlier.slice(0, 2).map((atBat) => renderCompletedRow(atBat))}
            </div>
          </>
        ) : (
          /* Live: two-zone layout — canvas + Earlier at-bats */
          <>
            <div className="pbpv2__canvas">
              {currentAtBat != null ? (
                <>
                  <div className="pbpv2__canvas-batter">
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
                  </div>
                  <div className="pbpv2__canvas-pitches" ref={canvasPitchesRef}>
                    {currentAtBat.pitches.length > 0 ? (
                      <div className="pbpv2__pitches">
                        <PitchTable atBat={currentAtBat} />
                      </div>
                    ) : (
                      <div className="pbpv2__empty">Waiting for first pitch…</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="pbpv2__empty">Waiting for updates…</div>
              )}
            </div>
            <div className="pbpv2__earlier">
              <div className="pbpv2__earlier-header">
                Earlier at-bats
                <span className="pbpv2__count"> · {canvasEarlierABs.length}</span>
              </div>
              {canvasEarlierABs.map((atBat) => renderCompletedRow(atBat))}
            </div>
          </>
        )
      ) : (
        /* ── Old single-scroll layout — final, replay, scout, pregame ── */
        <div className="pbpv2__body" ref={bodyRef} onScroll={handleScroll}>
          {totalCount === 0 && (
            <div className="pbpv2__empty">Waiting for updates…</div>
          )}

          {/* Current PA — pinned at top for replay mode */}
          {isStreaming && currentAtBat != null && (
            <div className={`pbpv2__pa ${isLive ? "pbpv2__pa--live" : "pbpv2__pa--normal"}`} data-ab-inning={currentAtBat.inning}>
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
                  {isLive && <LivePill label="LIVE" />}
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

          {/* Completed PAs — newest-first. Scout mode shows all ABs with head boundary. */}
          {orderedCompleted.map((atBat) => {
            if (scoutMode) {
              const isFuture = headAtBatIndex != null && atBat.atBatIndex > headAtBatIndex;
              const isCurrent = headAtBatIndex != null && atBat.atBatIndex === headAtBatIndex;
              const displayPitches = isCurrent && currentAtBat?.atBatIndex === atBat.atBatIndex
                ? currentAtBat.pitches
                : atBat.pitches;
              const scoring = !isFuture ? (scoringByAtBat?.get(atBat.atBatIndex) ?? null) : null;
              let rowClass = "pbpv2__pa";
              if (isCurrent) rowClass += " pbpv2__pa--scout-current";
              else if (isFuture) rowClass += " pbpv2__pa--future";
              else rowClass += " pbpv2__pa--normal";

              return (
                <div
                  key={atBat.atBatIndex}
                  className={rowClass}
                  data-ab-inning={atBat.inning}
                  ref={(el) => {
                    if (el) rowRefs.current.set(atBat.atBatIndex, el);
                    else rowRefs.current.delete(atBat.atBatIndex);
                  }}
                >
                  <div
                    className="pbpv2__pa-header"
                    onClick={() => onSeek?.(atBat.atBatIndex)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="pbpv2__pa-meta">
                      <span className="pbpv2__pa-inning">{halfLabel(atBat.half, atBat.inning)}</span>
                      <TeamMark
                        logoUrl={atBat.half === "top" ? awayLogoUrl : homeLogoUrl}
                        abbr={atBat.half === "top" ? awayAbbr : homeAbbr}
                        size={22}
                      />
                    </div>
                    {isFuture
                      ? <ScorebookCell muted width={40} />
                      : <ScorebookCell codeIn {...playResultToCellProps(atBat.result, atBat.scorebookCode)} width={40} />
                    }
                    <div className="pbpv2__pa-text">
                      {renderOrderSpot(orderByBatter, atBat.batterId)}
                      <Link to={`/player/${atBat.batterId}`} state={{ fromGame: game?.providerGameId }} className="pbpv2__batter-name player-link">{atBat.batterName}</Link>
                      {!isFuture && atBat.result != null && (
                        <>
                          {" "}
                          <span className="pbpv2__pa-summary">
                            · {playResultToLabel(atBat.result)}
                            {atBat.finalCount != null && <span className="num"> · {atBat.finalCount}</span>}
                          </span>
                        </>
                      )}
                      {scoring != null && <ScoringChip info={scoring} />}
                    </div>
                    <span />
                  </div>
                  {isCurrent && displayPitches.length > 0 && (
                    <div className="pbpv2__pitches">
                      <PitchTable atBat={{ ...atBat, pitches: displayPitches }} />
                    </div>
                  )}
                </div>
              );
            }

            return renderCompletedRow(atBat);
          })}

        </div>
      )}

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
