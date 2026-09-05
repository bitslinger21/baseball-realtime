import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { BoxScoreDto, GameViewDto } from "@bitslinger21/baseball-realtime-client";
import type { AtBatState } from "../../components/AtBatCard/atBatTypes";
import { OrderSpot } from "../../components/primitives/OrderSpot";
import { LivePill } from "../../components/primitives/Pill";
import { ScorebookCell } from "../../components/primitives/ScorebookCell";
import { Segmented } from "../../components/primitives/Segmented";
import { Th, Td } from "../../components/primitives/Table";
import "./PitchByPitchV2.css";
import "./ScoutControls.css";
import { RunnerTracePanel } from "./RunnerTracePanel";
import { ScoutTimeline } from "./ScoutTimeline";
import { DIAMOND_CORNERS, diamondSegPath, getInitialBase, TRACE_ORIGIN_COLOR } from "./diamondCoords";

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

// Batter header: pa-header padding 11×2=22 + meta (inning ~14 + gap 2 + logo 22)=38 + border = 61px
// Pitch area: pitches-div bottom-pad 14 + thead (4×2+font≈21) + 2×Td (9×2+font≈35 each) = 105px
const SPLIT_MIN_CANVAS_H = 166;
// Earlier header: padding 7×2+font≈30px + one collapsed batter row ≈61px
const SPLIT_MIN_EARLIER_H = 96;

type FilterKey = typeof FILTER_ITEMS[number];

function playResultToCode(result: string | undefined, scorebookCode?: string): string {
  switch (result) {
    case 'HomeRun': return 'HR';
    case 'Triple': return '3B';
    case 'Double': return '2B';
    case 'Single': return '1B';
    case 'Walk': return 'BB';
    case 'IntentionalWalk': return 'IBB';
    case 'HBP':
    case 'HitByPitch': return 'HBP';
    case 'Strikeout': return 'K';
    case 'SacFly': return 'SF';
    case 'SacBunt': return 'SH';
    case 'Error': return 'E';
    case 'FieldersChoice': return scorebookCode ?? 'FC';
    case 'Groundout': case 'Flyout': case 'Lineout': case 'PopOut':
    case 'DoublePlay': case 'TriplePlay': case 'Out':
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
  kind: "hit" | "out" | "walk" | "hbp" | "fc";
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
    case 'HitByPitch':
    case 'HBP':            return { code: 'HBP', kind: 'hbp',  reachedOnPA: 1, finalBase: 1 };
    case 'FieldersChoice': return { code: scorebookCode ?? 'FC', kind: 'fc', reachedOnPA: 1, finalBase: 1 };
    case 'Error':          return { code: scorebookCode ?? 'E',  kind: 'fc', reachedOnPA: 1, finalBase: 1 };
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

// ScorecardGrid — thin wrapper around window.buildScorebookGrid. Derives lineup/pitchers
// from boxScore (roster/stats) crossed with the live feed (per-inning cell results).
// Rendered into a plain div; the builder does all DOM work imperatively.
function ScorecardGrid({
  side, boxScore, completedAtBats, currentAtBat, orderByBatter, scoringByAtBat, runnerFinalBaseByAtBat, providerGameId,
  logoUrl, teamName, opponent, gameDate, venue, selectedRunnerAbIdx, hoveredAbIdx,
}: {
  side: "home" | "away";
  boxScore?: BoxScoreDto | null;
  completedAtBats: AtBatState[];
  currentAtBat: AtBatState | null;
  orderByBatter?: ReadonlyMap<number, number>;
  scoringByAtBat?: ReadonlyMap<number, ScoringInfo>;
  runnerFinalBaseByAtBat?: ReadonlyMap<number, ReadonlyArray<{ base: number; advancedByAtBatIndex?: number }>>;
  providerGameId?: string | null;
  logoUrl?: string | null;
  teamName?: string | null;
  opponent?: string | null;
  gameDate?: string | null;
  venue?: string | null;
  selectedRunnerAbIdx?: number | null;
  hoveredAbIdx?: number | null;
}): ReactElement {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document.getElementById('__scorebook_vars')) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cellCss: string = (window as any).SCOREBOOK_CELL_CSS ?? '';
    const st = document.createElement('style');
    st.id = '__scorebook_vars';
    st.textContent =
      ':root{--bg:#f4f1ea;--surface:#fcfaf6;--ink:#15161a;--accent:#b8421e;' +
      '--border:#cfc8b4;--borderStrong:#b4ae9b;--textFaint:#6f685f;--textMuted:#5c574f;' +
      '--starterBg:#E4FDFF;--subBg:#F5FFFF}' +
      cellCss;
    document.head.appendChild(st);
  }, []);

  const sideHalf: "top" | "bottom" = side === "away" ? "top" : "bottom";
  const oppHalf: "top" | "bottom" = side === "away" ? "bottom" : "top";
  const boxSide = boxScore?.[side];

  const allABs = [...completedAtBats, ...(currentAtBat != null ? [currentAtBat] : [])];

  // Compute per-AB out number (1/2/3) and half-end marker for this side's completed ABs.
  const BATTER_OUT_RESULTS = new Set([
    'Strikeout', 'Groundout', 'Flyout', 'Lineout', 'PopOut', 'Out',
    'SacFly', 'SacBunt', 'DoublePlay', 'TriplePlay',
  ]);
  const outsFromResult = (r: string | null | undefined): number => {
    if (!BATTER_OUT_RESULTS.has(r ?? '')) return 0;
    if (r === 'DoublePlay') return 2;
    if (r === 'TriplePlay') return 3;
    return 1;
  };
  const outNumByAB = new Map<number, number>();
  // halfEndABs: driven by isHalfEnd flag set in useAtBatHistory when the next AB belongs to a
  // different half-inning. This is more reliable than counting batter-result outs because runner
  // outs (CS, pickoffs, thrown out advancing) are not batter PAs and leave the count short of 3.
  const halfEndABs = new Set<number>(
    completedAtBats
      .filter(ab => ab.half === sideHalf && ab.isHalfEnd)
      .map(ab => ab.atBatIndex),
  );
  const sideCompletedByInn = new Map<number, AtBatState[]>();
  for (const ab of completedAtBats) {
    if (ab.half !== sideHalf || ab.result == null) continue;
    const list = sideCompletedByInn.get(ab.inning) ?? [];
    list.push(ab);
    sideCompletedByInn.set(ab.inning, list);
  }
  for (const abs of sideCompletedByInn.values()) {
    const sorted = [...abs].sort((a, b) => a.atBatIndex - b.atBatIndex);
    let outCount = 0;
    for (const ab of sorted) {
      const outs = outsFromResult(ab.result);
      if (outs > 0) {
        outCount += outs;
        // If this AB ended the half-inning (isHalfEnd), always display it as out #3 —
        // the 3rd out may have come from a baserunner event not counted in batter results.
        const displayNum = halfEndABs.has(ab.atBatIndex) ? 3 : Math.min(outCount, 3);
        outNumByAB.set(ab.atBatIndex, displayNum);
        if (outCount >= 3) break;
      }
    }
  }

  const scoreboardHitResults = new Set(['Single', 'Double', 'Triple', 'HomeRun']);
  const scoreboardNonABResults = new Set(['Walk', 'IntentionalWalk', 'HitByPitch', 'SacFly', 'SacBunt']);

  // Jersey number lookup: atBatIndex → batterId → jerseyNumber (for advancement annotations).
  const atBatIdxToPlayerId = new Map<number, number>(allABs.map(ab => [ab.atBatIndex, ab.batterId]));
  const playerIdToJerseyNo = new Map<number, string>(
    (boxSide?.batting ?? []).filter(b => b.playerId != null && b.jerseyNumber != null).map(b => [b.playerId!, b.jerseyNumber!]),
  );

  const lineup = Array.from({ length: 9 }, (_, i) => {
    const order = i + 1;
    const players = (boxSide?.batting ?? [])
      .filter(b => b.battingOrder != null && Math.floor(parseInt(b.battingOrder, 10) / 100) === order)
      .sort((a, b) => (parseInt(a.battingOrder!, 10) % 100) - (parseInt(b.battingOrder!, 10) % 100));
    const starter = players[0];
    const subs = players.slice(1);
    const ownPAs = allABs.filter(ab => ab.half === sideHalf && orderByBatter?.get(ab.batterId) === order);
    type CellEntry = { code?: string; live?: boolean; balls?: number; strikes?: number; result?: string; isLooking?: boolean; outNum?: number; halfEnd?: boolean; advances?: { base: number; label: string }[]; atBatIndex?: number };
    const cellsByInn: Record<number, CellEntry[]> = {};
    ownPAs.forEach(ab => {
      if (ab === currentAtBat) {
        const lastPitch = ab.pitches.length > 0 ? ab.pitches[ab.pitches.length - 1] : null;
        const [curB, curS] = lastPitch != null ? lastPitch.count.split('-').map(Number) : [0, 0];
        const entry: CellEntry = {
          live: true,
          balls: Number.isFinite(curB) ? curB : 0,
          strikes: Number.isFinite(curS) ? curS : 0,
        };
        cellsByInn[ab.inning] = [...(cellsByInn[ab.inning] ?? []), entry];
      } else if (ab.result != null) {
        const [b, s] = (ab.finalCount ?? '').split('-').map(Number);
        const lastPitch = ab.pitches.slice().reverse().find(p => p.isLastPitch);
        const isLooking = ab.result === 'Strikeout' && lastPitch != null &&
          lastPitch.result.toLowerCase() === 'called strike';
        const runnerAdvances = runnerFinalBaseByAtBat?.get(ab.atBatIndex);
        const advances = runnerAdvances?.map(a => {
          const advPlayerId = a.advancedByAtBatIndex != null ? atBatIdxToPlayerId.get(a.advancedByAtBatIndex) : undefined;
          const jerseyNo = advPlayerId != null ? playerIdToJerseyNo.get(advPlayerId) : undefined;
          return { base: a.base, label: jerseyNo != null ? `#${jerseyNo}` : '' };
        });
        const entry: CellEntry = {
          code: playResultToCode(ab.result, ab.scorebookCode),
          balls: Number.isFinite(b) ? b : 0,
          strikes: Number.isFinite(s) ? s : 0,
          result: ab.result,
          isLooking,
          outNum: outNumByAB.get(ab.atBatIndex),
          halfEnd: halfEndABs.has(ab.atBatIndex),
          advances: advances && advances.length > 0 ? advances : undefined,
          atBatIndex: ab.atBatIndex,
        };
        cellsByInn[ab.inning] = [...(cellsByInn[ab.inning] ?? []), entry];
      }
    });
    // Derive tally stats from completed at-bats (accurate at any play-head position).
    const starterPAs = completedAtBats.filter(
      ab => ab.half === sideHalf && ab.result != null && ab.batterId === starter?.playerId,
    );
    const lastStarterPA = starterPAs[starterPAs.length - 1];
    const seasonAvg = starter?.seasonAvg;
    return {
      order,
      no: starter?.jerseyNumber ?? '',
      name: starter?.name ?? '',
      playerId: starter?.playerId ?? null,
      pos: starter?.position ?? '',
      avg: seasonAvg != null
        ? seasonAvg.replace(/^0\./, '.')
        : starter != null && starter.ab > 0
          ? (starter.h / starter.ab).toFixed(3).replace(/^0/, '')
          : '—',
      subs: subs.map(s => ({ no: s.jerseyNumber ?? '', name: s.name, playerId: s.playerId ?? null, pos: s.position ?? '' })),
      stats: {
        ab: starterPAs.filter(ab => !scoreboardNonABResults.has(ab.result ?? '')).length,
        h: starterPAs.filter(ab => scoreboardHitResults.has(ab.result ?? '')).length,
        r: lastStarterPA?.gameR ?? 0,
        rbi: lastStarterPA?.gameRBI ?? 0,
      },
      cellsByInn,
    };
  });

  // Extra innings / batting-around: compute the actual number of innings played for this side.
  const numInnings = allABs.filter(ab => ab.half === sideHalf).reduce((max, ab) => Math.max(max, ab.inning), 9);

  // Opposing pitchers face this side's batters — show their info on this scorecard.
  const oppBoxSide = boxScore?.[side === 'away' ? 'home' : 'away'];
  const ownPAsCompleted = completedAtBats.filter(ab => ab.half === sideHalf);
  const pitchers = (oppBoxSide?.pitching ?? []).slice(0, 4).map(p => {
    const cellsByInn: Record<number, { r: number; h: number; k: number; bb: number }> = {};
    for (let inn = 1; inn <= numInnings; inn++) {
      const innPAs = ownPAsCompleted.filter(ab => ab.inning === inn);
      cellsByInn[inn] = {
        r: innPAs.reduce((sum, ab) => sum + (scoringByAtBat?.get(ab.atBatIndex)?.runs ?? 0), 0),
        h: innPAs.filter(ab => scoreboardHitResults.has(ab.result ?? '')).length,
        k: innPAs.filter(ab => ab.result === 'Strikeout').length,
        bb: innPAs.filter(ab => ab.result === 'Walk' || ab.result === 'IntentionalWalk').length,
      };
    }
    const bullpenMatch = (oppBoxSide?.bullpen ?? []).find(b => b.name === p.name);
    return {
      no: p.jerseyNumber ?? '',
      name: p.name,
      era: bullpenMatch?.era ?? '—',
      hnd: (p.position ?? '').slice(0, 3),
      cellsByInn,
    };
  });

  // Player-link click handler — intercepts [data-player-link] anchors and navigates via React Router.
  useEffect(() => {
    const el = ref.current;
    if (el == null) return;
    const handler = (e: MouseEvent): void => {
      const target = (e.target as Element).closest('[data-player-link]');
      if (target == null) return;
      e.preventDefault();
      const playerId = target.getAttribute('data-player-link');
      if (playerId) navigate(`/player/${playerId}`);
    };
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [navigate]);


  useEffect(() => {
    const grid = ref.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const build = (window as any).buildScorebookGrid;
    if (grid != null && build != null) build(grid, { lineup, pitchers, numInnings, gameId: providerGameId, teamAbbr: boxSide?.teamAbbr, logoUrl, teamName, opponent, gameDate, venue });
  });

  // Three-state highlight: origin / movement / unrelated. The scorecard's own
  // lines are ALWAYS ink — no colour of any kind belongs here (colour is the
  // panel's alone) — so origin and movement cells both get the same plain ink
  // outline, and a movement cell additionally gets the traced runner's SPECIFIC
  // advance segment drawn as an extra ink polyline over the batter's own result
  // (stroke-width 2.4, filled r=3 dot at the destination base).
  // Must run AFTER the build effect so it always applies on top of the rebuilt DOM.
  useEffect(() => {
    const el = ref.current;
    if (el == null) return;
    el.querySelectorAll('[data-ab-idx]').forEach((node) => {
      const n = node as HTMLElement;
      n.style.removeProperty('opacity');
      n.style.removeProperty('outline');
      n.style.removeProperty('outline-offset');
      n.style.removeProperty('box-shadow');
      n.querySelector('.rt-trace-overlay')?.remove();
    });
    if (selectedRunnerAbIdx == null) return;
    const originAb = completedAtBats.find((ab) => ab.atBatIndex === selectedRunnerAbIdx);
    const startBase = getInitialBase(originAb?.result);
    const advances = runnerFinalBaseByAtBat?.get(selectedRunnerAbIdx) ?? [];
    // Which specific base-to-base segment (of THIS traced runner) each driver
    // play is responsible for — a play can move several runners, but the
    // scorecard only ever draws the one being traced.
    const segByDriver = new Map<number, { fromBase: number; toBase: number }>();
    advances.forEach((adv, i) => {
      if (adv.advancedByAtBatIndex == null) return;
      const fromBase = i === 0 ? startBase : Math.min(advances[i - 1].base, 4);
      segByDriver.set(adv.advancedByAtBatIndex, { fromBase, toBase: Math.min(adv.base, 4) });
    });
    el.querySelectorAll('[data-ab-idx]').forEach((node) => {
      const n = node as HTMLElement;
      const idx = Number(n.getAttribute('data-ab-idx'));
      const seg = segByDriver.get(idx);
      if (idx === selectedRunnerAbIdx || seg != null) {
        n.style.outline = `2px solid ${TRACE_ORIGIN_COLOR}`;
        n.style.outlineOffset = '-2px';
        if (seg != null) {
          const field = n.querySelector('.cwfield');
          if (field != null) {
            const [tx, ty] = DIAMOND_CORNERS[seg.toBase];
            const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            overlay.setAttribute('class', 'rt-trace-overlay');
            overlay.innerHTML =
              `<path d="${diamondSegPath(seg.fromBase, seg.toBase)}" stroke="${TRACE_ORIGIN_COLOR}" stroke-width="2.4" stroke-linecap="round" fill="none"/>` +
              `<circle cx="${tx}" cy="${ty}" r="3" fill="${TRACE_ORIGIN_COLOR}"/>`;
            field.appendChild(overlay);
          }
        }
      } else {
        n.style.opacity = '0.32';
      }
    });
    if (hoveredAbIdx != null) {
      const hovered = el.querySelector(`[data-ab-idx="${hoveredAbIdx}"]`) as HTMLElement | null;
      if (hovered != null) {
        hovered.style.boxShadow = `0 0 0 2px ${TRACE_ORIGIN_COLOR}`;
      }
    }
  });

  return <div ref={ref} />;
}

export interface ScoringInfo {
  runs: number;
  awayScore: number;
  homeScore: number;
  awayAbbr: string;
  homeAbbr: string;
}

type TeamMeta = { logoUrl?: string | null };

interface ScoutControlsPassthrough {
  playing: boolean;
  onToggle: () => void;
  onStep: (dir: -1 | 1) => void;
  onStepBatter: (dir: -1 | 1) => void;
  markerMoment: number;
  totalMoments: number;
  contextLabel: string | null;
  inningOptions: { label: string; headIdx: number; key: string }[];
  onSeekInning: (headIdx: number) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  runMarkers: { idx: number; team: "away" | "home"; count: number }[];
  halfInnings: { idx: number; half: "top" | "bottom"; inning: number }[];
}

interface PitchByPitchV2Props {
  completedAtBats: AtBatState[];
  currentAtBat: AtBatState | null;
  game?: GameViewDto | null;
  boxScore?: BoxScoreDto | null;
  scoringByAtBat?: ReadonlyMap<number, ScoringInfo>;
  runnerFinalBaseByAtBat?: ReadonlyMap<number, ReadonlyArray<{ base: number; advancedByAtBatIndex?: number }>>;
  orderByBatter?: ReadonlyMap<number, number>;
  isReplayMode?: boolean;
  scoutMode?: boolean;
  allCompletedAtBats?: AtBatState[];
  markerAtBatIndex?: number | null;
  onSeek?: (atBatIndex: number) => void;
  scoutControls?: ScoutControlsPassthrough;
  /** When provided, makes the flip state controlled by the parent. */
  flipped?: boolean;
  onFlipChange?: (open: boolean) => void;
}

export function PitchByPitchV2({ completedAtBats, currentAtBat, game, boxScore, scoringByAtBat, runnerFinalBaseByAtBat, orderByBatter, isReplayMode = false, scoutMode = false, allCompletedAtBats, markerAtBatIndex, onSeek, scoutControls, flipped: flippedProp, onFlipChange }: PitchByPitchV2Props): ReactElement {
  const [filterIdx, setFilterIdx] = useState(0);
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set());
  const [traceAtBatIdx, setTraceAtBatIdx] = useState<number | null>(null);
  const [traceClosing, setTraceClosing] = useState(false);
  const [traceHoveredAbIdx, setTraceHoveredAbIdx] = useState<number | null>(null);
  function handleTraceClose(): void {
    setTraceClosing(true);
    setTimeout(() => { setTraceAtBatIdx(null); setTraceClosing(false); setTraceHoveredAbIdx(null); }, 280);
  }


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
    if (!scoutMode || markerAtBatIndex == null) return;
    const el = bodyRef.current;
    const row = rowRefs.current.get(markerAtBatIndex);
    if (el == null || row == null) return;
    const target = row.offsetTop - el.clientHeight / 2 + row.clientHeight / 2;
    el.scrollTop = Math.max(0, target);
  }, [scoutMode, markerAtBatIndex]);

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

  // Canvas scout/play mode: scroll pitch region to bottom when a pitch is added.
  // Declared before the reset-to-top effect so that on a batter switch (both fire),
  // reset-to-top runs last and wins.
  useLayoutEffect(() => {
    if (!useCanvasLayout || !scoutMode) return;
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
  }, [markerAtBatIndex, useCanvasLayout, scoutMode]);

  // Live canvas "Earlier at-bats" ref — used in wheel handler to let native scroll work.
  const liveEarlierRef = useRef<HTMLDivElement>(null);

  // Scorecard flip — controlled by parent when flippedProp is provided
  const [flippedInternal, setFlippedInternal] = useState(false);
  const flipped = flippedProp ?? flippedInternal;
  function setFlipped(v: boolean): void {
    if (onFlipChange != null) onFlipChange(v);
    else setFlippedInternal(v);
  }
  const [scorecardTeam, setScorecardTeam] = useState<"home" | "away" | null>(null);
  const [scorecardFading, setScorecardFading] = useState(false);
  // Close the runner trace panel when the scorecard flips away.
  useEffect(() => { if (!flipped) { setTraceAtBatIdx(null); setTraceHoveredAbIdx(null); } }, [flipped]);
  function switchScorecardTeam(team: "home" | "away"): void {
    setScorecardFading(true);
    setTimeout(() => {
      setScorecardTeam(team);
      setScorecardFading(false);
    }, 150);
  }

  // Auto-switch scorecard to the batting team when the half-inning changes.
  const prevHalfRef = useRef<"top" | "bottom" | null>(null);
  useEffect(() => {
    const h = currentAtBat?.half ?? null;
    if (h != null && h !== prevHalfRef.current) {
      prevHalfRef.current = h;
      setScorecardTeam(h === "top" ? "away" : "home");
    }
  }, [currentAtBat?.half]);
  const scorecardViewRef = useRef<HTMLDivElement>(null);
  const scorecardContentRef = useRef<HTMLDivElement>(null);
  const scorecardXf = useRef({ scale: 1, tx: 0, ty: 0 });
  const scorecardDrag = useRef<{ x: number; y: number } | null>(null);
  const scorecardPinch = useRef<{ dist: number; scale: number } | null>(null);

  function applyScorecardXf(): void {
    if (scorecardContentRef.current != null) {
      const { tx, ty, scale } = scorecardXf.current;
      scorecardContentRef.current.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    }
  }

  function zoomScorecardAt(mx: number, my: number, mul: number): void {
    const prev = scorecardXf.current.scale;
    scorecardXf.current.scale = Math.min(2.5, Math.max(0.5, prev * mul));
    scorecardXf.current.tx = mx - (mx - scorecardXf.current.tx) * (scorecardXf.current.scale / prev);
    scorecardXf.current.ty = my - (my - scorecardXf.current.ty) * (scorecardXf.current.scale / prev);
    applyScorecardXf();
  }

  // Non-passive wheel zoom on the scorecard viewport — only registered while the scorecard is shown.
  useEffect(() => {
    if (!flipped) return;
    const el = scorecardViewRef.current;
    if (el == null) return;
    function onScorecardWheel(e: WheelEvent): void {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const pinch = e.ctrlKey;
      const base = e.deltaY < 0 ? (pinch ? 1.08 : 1.03) : (pinch ? 0.93 : 0.97);
      const power = Math.min(Math.abs(e.deltaY) / (pinch ? 6 : 20), pinch ? 8 : 4);
      zoomScorecardAt(mx, my, Math.pow(base, power));
    }
    el.addEventListener("wheel", onScorecardWheel, { passive: false });
    return () => el.removeEventListener("wheel", onScorecardWheel);
  }, [flipped]);

  function onScorecardPointerDown(e: React.PointerEvent<HTMLDivElement>): void {
    // Let runner-trace cell clicks propagate as normal click events.
    if ((e.target as Element).closest("[data-runner-ab]") != null) return;
    e.preventDefault();
    scorecardDrag.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = "grabbing";
  }

  function onScorecardPointerMove(e: React.PointerEvent<HTMLDivElement>): void {
    if (scorecardDrag.current == null) return;
    scorecardXf.current.tx += e.clientX - scorecardDrag.current.x;
    scorecardXf.current.ty += e.clientY - scorecardDrag.current.y;
    scorecardDrag.current = { x: e.clientX, y: e.clientY };
    applyScorecardXf();
  }

  function onScorecardPointerUp(e: React.PointerEvent<HTMLDivElement>): void {
    scorecardDrag.current = null;
    e.currentTarget.style.cursor = "grab";
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
  }

  function onScorecardTouchStart(e: React.TouchEvent<HTMLDivElement>): void {
    if (e.touches.length === 2) {
      const [a, b] = e.touches;
      scorecardPinch.current = {
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        scale: scorecardXf.current.scale,
      };
      scorecardDrag.current = null;
    } else if (e.touches.length === 1) {
      scorecardDrag.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  function onScorecardTouchMove(e: React.TouchEvent<HTMLDivElement>): void {
    const rect = scorecardViewRef.current?.getBoundingClientRect();
    if (rect == null) return;
    if (e.touches.length === 2 && scorecardPinch.current != null) {
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const mx = (a.clientX + b.clientX) / 2 - rect.left;
      const my = (a.clientY + b.clientY) / 2 - rect.top;
      const targetScale = scorecardPinch.current.scale * (dist / scorecardPinch.current.dist);
      zoomScorecardAt(mx, my, targetScale / scorecardXf.current.scale);
    } else if (e.touches.length === 1 && scorecardDrag.current != null) {
      const t = e.touches[0];
      scorecardXf.current.tx += t.clientX - scorecardDrag.current.x;
      scorecardXf.current.ty += t.clientY - scorecardDrag.current.y;
      scorecardDrag.current = { x: t.clientX, y: t.clientY };
      applyScorecardXf();
    }
  }

  function onScorecardTouchEnd(e: React.TouchEvent<HTMLDivElement>): void {
    if (e.touches.length < 2) scorecardPinch.current = null;
    if (e.touches.length === 0) scorecardDrag.current = null;
  }

  // Scout Earlier zone ref — for scroll-into-view transition on batter change.
  const scoutEarlierRef = useRef<HTMLDivElement>(null);
  const scoutEarlierInitRef = useRef(false);


  // Resizable split between canvas (current batter) and earlier-at-bats panel
  const [splitEarlierPx, setSplitEarlierPx] = useState(() => scoutMode ? 140 : 200);
  const splitDragRef = useRef<{ startY: number; startPx: number } | null>(null);

  // Scout Earlier: when head advances, jump one row down then smooth-scroll to top
  // so the newly completed AB scrolls into view from below the header.
  // Skip the animation on first mount — just snap to top instantly.
  useLayoutEffect(() => {
    if (!scoutMode || markerAtBatIndex == null) return;
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
  }, [markerAtBatIndex, scoutMode]);

  function onSplitDown(e: React.PointerEvent<HTMLDivElement>): void {
    e.preventDefault();
    splitDragRef.current = { startY: e.clientY, startPx: splitEarlierPx };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onSplitMove(e: React.PointerEvent<HTMLDivElement>): void {
    if (splitDragRef.current == null) return;
    const dy = e.clientY - splitDragRef.current.startY;
    // Drag down → earlier shrinks (subtract dy); drag up → earlier grows
    let next = splitDragRef.current.startPx - dy;
    next = Math.max(SPLIT_MIN_EARLIER_H, next);
    const frame = pbpv2FrameRef.current;
    if (frame != null) {
      const upcomingH = scoutMode ? 85 : 0;
      const avail = frame.clientHeight - 60 - 1 - 8 - upcomingH; // header, footer-rule, handle, upcoming
      next = Math.min(next, avail - SPLIT_MIN_CANVAS_H);
    }
    setSplitEarlierPx(Math.max(SPLIT_MIN_EARLIER_H, next));
  }

  function onSplitUp(e: React.PointerEvent<HTMLDivElement>): void {
    splitDragRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
  }

  const splitHandle = (
    <div
      className="pbpv2__split-handle"
      onPointerDown={onSplitDown}
      onPointerMove={onSplitMove}
      onPointerUp={onSplitUp}
    />
  );

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
  const scorecardEffSide = scorecardTeam ?? (currentAtBat?.half === "top" ? "away" : "home");
  const scorecardLogoUrl = scorecardEffSide === "away" ? awayLogoUrl : homeLogoUrl;
  const scorecardTeamName = scorecardEffSide === "away" ? (game?.awayName ?? awayAbbr) : (game?.homeName ?? homeAbbr);
  const scorecardOpponent = scorecardEffSide === "away" ? (game?.homeName ?? homeAbbr) : (game?.awayName ?? awayAbbr);
  const scorecardGameDate = game?.gameDate
    ? new Date(`${game.gameDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).replace(",", "")
    : null;
  const scorecardVenue = (game?.snapshot as { venue?: string } | null | undefined)?.venue ?? null;

  // Detect runner-scored across all batters: if a batter's gameR is higher in their next
  // AB than this one, they scored as a runner between appearances. Uses the full history
  // so that even the last AB for a given batter in the visible slice gets marked correctly.
  const scoredByAtBatIndex = useMemo(() => {
    const s = new Set<number>();
    const lastByBatter = new Map<number, AtBatState>();
    for (const ab of (allCompletedAtBats ?? completedAtBats)) {
      const prev = lastByBatter.get(ab.batterId);
      if (prev != null && prev.gameR != null && ab.gameR != null && ab.gameR > prev.gameR) {
        s.add(prev.atBatIndex);
      }
      lastByBatter.set(ab.batterId, ab);
    }
    return s;
  }, [allCompletedAtBats, completedAtBats]);

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
  const scoutUpcoming = (scoutMode && markerAtBatIndex != null)
    ? [...scoutAllABs].filter((ab) => ab.atBatIndex > markerAtBatIndex)
    : [];
  const scoutEarlier = scoutMode
    ? [...scoutAllABs].filter((ab) => markerAtBatIndex == null || ab.atBatIndex < markerAtBatIndex).reverse()
    : [];

  const totalCount = scoutMode
    ? (allCompletedAtBats ?? completedAtBats).length
    : completedAtBats.length + (currentAtBat != null ? 1 : 0);

  // Keep the step callback current every render so the wheel listener never goes stale.
  wheelStepRef.current = (down: boolean) => {
    if (scoutMode && scoutControls != null) {
      // Step one pitch (moment) at a time — not one at-bat. down=scroll-down=earlier=-1.
      const next = Math.max(1, Math.min(scoutControls.totalMoments, scoutControls.markerMoment + (down ? -1 : 1)));
      scoutControls.onSeekInning(next);
    } else if (!scoutMode && down) {
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
      const dy = e.deltaY;
      if (Math.abs(dy) < DEADZONE) return;
      const down = dy > 0;

      // Allow native scroll on the live "Earlier at-bats" section — don't intercept.
      const earlierEl = liveEarlierRef.current;
      if (earlierEl != null && earlierEl.contains(e.target as Node)) {
        const canDown = earlierEl.scrollHeight - earlierEl.scrollTop > earlierEl.clientHeight + 2;
        const canUp = earlierEl.scrollTop > 2;
        if ((down && canDown) || (!down && canUp)) return;
      }

      e.preventDefault();
      if (wheelCooldownRef.current) return;
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


  // Auto-pan scorecard so every highlighted cell (origin + every movement/driver
  // cell) clears the 350px trace panel — not just the origin. A trace can span
  // several innings; if the full span can't fit, prioritise the origin and the
  // final movement and let the middle scroll off, per PROMPT_runner_trace.md §5.
  useEffect(() => {
    if (traceAtBatIdx == null || !flipped) return;
    const tid = setTimeout(() => {
      const viewEl = scorecardViewRef.current;
      const contentEl = scorecardContentRef.current;
      if (viewEl == null || contentEl == null) return;

      const advances = runnerFinalBaseByAtBat?.get(traceAtBatIdx) ?? [];
      const driverIdxs = advances
        .map((a) => a.advancedByAtBatIndex)
        .filter((x): x is number => x != null);
      const allIdxs = [traceAtBatIdx, ...driverIdxs];
      const cellsAll = allIdxs
        .map((idx) => contentEl.querySelector(`[data-ab-idx="${idx}"]`) as HTMLElement | null)
        .filter((c): c is HTMLElement => c != null);
      if (cellsAll.length === 0) return;

      const viewRect = viewEl.getBoundingClientRect();
      const panelWidth = 350;
      const clearWidth = viewRect.width - panelWidth;

      const spanOf = (cells: HTMLElement[]): { left: number; right: number } => {
        let left = Infinity;
        let right = -Infinity;
        for (const c of cells) {
          const r = c.getBoundingClientRect();
          left = Math.min(left, r.left - viewRect.left);
          right = Math.max(right, r.right - viewRect.left);
        }
        return { left, right };
      };

      let span = spanOf(cellsAll);
      if (span.right - span.left > clearWidth - 16 && cellsAll.length > 2) {
        const originCell = contentEl.querySelector(`[data-ab-idx="${traceAtBatIdx}"]`) as HTMLElement | null;
        const lastDriverIdx = driverIdxs[driverIdxs.length - 1];
        const lastCell = lastDriverIdx != null
          ? (contentEl.querySelector(`[data-ab-idx="${lastDriverIdx}"]`) as HTMLElement | null)
          : null;
        const priorityCells = [originCell, lastCell].filter((c): c is HTMLElement => c != null);
        if (priorityCells.length > 0) span = spanOf(priorityCells);
      }

      if (span.right > clearWidth - 8) {
        scorecardXf.current.tx -= span.right - clearWidth + 32;
        applyScorecardXf();
      } else if (span.left < 8) {
        scorecardXf.current.tx -= span.left - 8;
        applyScorecardXf();
      }
    }, 50);
    return () => clearTimeout(tid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traceAtBatIdx, flipped]);

  function flipToScorecard(): void {
    const defaultSide: "home" | "away" = currentAtBat?.half === "top" ? "away" : "home";
    setScorecardTeam((t) => t ?? defaultSide);
    scorecardXf.current = { scale: 1, tx: 0, ty: 0 };
    applyScorecardXf();
    setFlipped(true);
  }

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

          {(() => {
            const runnerAdvances = runnerFinalBaseByAtBat?.get(atBat.atBatIndex);
            const runnerFinal = runnerAdvances != null && runnerAdvances.length > 0 ? runnerAdvances[runnerAdvances.length - 1].base : undefined;
            const cellProps = playResultToCellProps(atBat.result, atBat.scorebookCode);
            const scored = atBat.result === 'HomeRun'
              || scoredByAtBatIndex.has(atBat.atBatIndex)
              || (runnerFinal != null && runnerFinal >= 4);
            return (
              <ScorebookCell
                codeIn
                {...cellProps}
                finalBase={runnerFinal ?? cellProps.finalBase}
                scored={scored}
                width={40}
              />
            );
          })()}

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
      <div className={`pbpv2__header${scoutMode && scoutControls != null && !flipped ? " pbpv2__header--scout" : ""}`}>
        {flipped ? (
          <>
            <div>
              <span className="pbpv2__title pbpv2__title--scorebook">
                SC
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 12 12" style={{ display: "inline-block", verticalAlign: "middle", margin: "0 1px 2px" }}>
                  <polygon points="6,0 12,6 6,12 0,6" fill="none" stroke="#b8421e" strokeWidth="1.5" />
                </svg>
                REBOOK
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {scoutMode && scoutControls != null && (
                <div className="scout-controls__right">
                  <select
                    className="scout-controls__select scout-controls__select--inning"
                    value={[...scoutControls.inningOptions].reverse().find(o => o.headIdx <= scoutControls.markerMoment)?.headIdx ?? scoutControls.inningOptions[0]?.headIdx ?? 1}
                    onChange={e => scoutControls.onSeekInning(Number(e.target.value))}
                    title="Jump to inning"
                  >
                    {scoutControls.inningOptions.map(o => (
                      <option key={o.key} value={o.headIdx}>{o.label}</option>
                    ))}
                  </select>
                  <select
                    className="scout-controls__select scout-controls__select--speed"
                    value={scoutControls.speed}
                    onChange={e => scoutControls.onSpeedChange(Number(e.target.value))}
                    title="Playback speed"
                  >
                    {[0.5, 1, 2, 4].map(s => (
                      <option key={s} value={s}>{s}×</option>
                    ))}
                  </select>
                  <div className="scout-controls__sep" />
                </div>
              )}
              <Segmented
                items={[awayAbbr, homeAbbr]}
                active={scorecardTeam === "home" ? 1 : 0}
                onClick={(i) => switchScorecardTeam(i === 0 ? "away" : "home")}
                size="sm"
              />
              <button
                type="button"
                className="pbpv2__flip-btn"
                onClick={() => setFlipped(false)}
                title="Back to pitch by pitch"
              >
                <svg width="14" height="14" viewBox="0 0 16 16">
                  <path d="M10 3 L5 8 L10 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </>
        ) : scoutMode && scoutControls != null ? (
          <>
            <div className="pbpv2__header-r1">
              <span className="pbpv2__title">{scoutControls.contextLabel ?? "Scout"}</span>
              <div className="scout-controls__right">
                <select
                  className="scout-controls__select scout-controls__select--inning"
                  value={[...scoutControls.inningOptions].reverse().find(o => o.headIdx <= scoutControls.markerMoment)?.headIdx ?? scoutControls.inningOptions[0]?.headIdx ?? 1}
                  onChange={e => scoutControls.onSeekInning(Number(e.target.value))}
                  title="Jump to inning"
                >
                  {scoutControls.inningOptions.map(o => (
                    <option key={o.key} value={o.headIdx}>{o.label}</option>
                  ))}
                </select>
                <select
                  className="scout-controls__select scout-controls__select--speed"
                  value={scoutControls.speed}
                  onChange={e => scoutControls.onSpeedChange(Number(e.target.value))}
                  title="Playback speed"
                >
                  {[0.5, 1, 2, 4].map(s => (
                    <option key={s} value={s}>{s}×</option>
                  ))}
                </select>
                <div className="scout-controls__sep" />
                <button
                  type="button"
                  className="scout-controls__step-btn"
                  onClick={() => scoutControls.onStepBatter(-1)}
                  aria-label="Previous batter"
                  disabled={scoutControls.markerMoment <= 0}
                >
                  ⏪
                </button>
                <span className="scout-controls__step-label"><img src="/baseball-bat.svg" width="20" height="20" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }} alt="" /></span>
                <button
                  type="button"
                  className="scout-controls__step-btn"
                  onClick={() => scoutControls.onStepBatter(1)}
                  aria-label="Next batter"
                  disabled={scoutControls.markerMoment >= scoutControls.totalMoments}
                >
                  ⏩
                </button>
                <div className="scout-controls__sep" />
                <button
                  type="button"
                  className="scout-controls__step-btn"
                  onClick={() => scoutControls.onStep(-1)}
                  aria-label="Previous pitch"
                  disabled={scoutControls.markerMoment <= 0}
                >
                  ⏮
                </button>
                <span className="scout-controls__step-label"><img src="/baseball.svg" width="20" height="20" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }} alt="" /></span>
                <button
                  type="button"
                  className="scout-controls__step-btn"
                  onClick={() => scoutControls.onStep(1)}
                  aria-label="Next pitch"
                  disabled={scoutControls.markerMoment >= scoutControls.totalMoments}
                >
                  ⏭
                </button>
                <div className="scout-controls__sep" />
                <button
                  type="button"
                  className={`scout-controls__play-btn${scoutControls.playing ? " scout-controls__play-btn--playing" : ""}`}
                  onClick={scoutControls.onToggle}
                  aria-label={scoutControls.playing ? "Review" : "Play"}
                >
                  <span className="scout-controls__play-icon">{scoutControls.playing ? "⏸" : "▶"}</span>
                  <span className="scout-controls__play-label">{scoutControls.playing ? "Review" : "Play"}</span>
                </button>
                <div className="scout-controls__sep" />
                <button
                  type="button"
                  className="pbpv2__flip-btn"
                  onClick={flipToScorecard}
                  title="Scorecard view"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14">
                    <polygon points="7,1 13,7 7,13 1,7" fill="none" stroke="#b8421e" strokeWidth="1.5" />
                  </svg>
                </button>
              </div>
            </div>
            <ScoutTimeline
              total={scoutControls.totalMoments}
              markerIdx={scoutControls.markerMoment}
              onSeek={scoutControls.onSeekInning}
              runMarkers={scoutControls.runMarkers}
              halfInnings={scoutControls.halfInnings}
            />
          </>
        ) : (
          <>
            <div>
              <span className="pbpv2__title">Pitch by pitch</span>
              <span className="pbpv2__count">· {totalCount} at-bats</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                className="pbpv2__flip-btn"
                onClick={flipToScorecard}
                title="Scorecard view"
              >
                <svg width="14" height="14" viewBox="0 0 14 14">
                  <polygon points="7,1 13,7 7,13 1,7" fill="none" stroke="#b8421e" strokeWidth="1.5" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      <div className="pbpv2__content-area">
      {useCanvasLayout ? (
        scoutMode ? (
          /* Scout: three-zone layout — Upcoming ▸ Canvas ▸ Earlier */
          <>
            {/* Zone 1: Current-AB canvas — ink border, ▸ marker */}
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
                <div className="pbpv2__empty">{scoutControls?.markerMoment === 0 ? "Press play to watch the game" : "Waiting for updates…"}</div>
              )}
            </div>

            {/* Zone 3: Earlier at-bats — always present; scroll-reveals new entry on batter change */}
            {splitHandle}
            <div className="pbpv2__earlier pbpv2__earlier--scout" ref={scoutEarlierRef} style={{ height: splitEarlierPx }}>
              <div className="pbpv2__earlier-header">
                Earlier at-bats
                {scoutEarlier.length > 0 && <span className="pbpv2__count"> · {scoutEarlier.length}</span>}
              </div>
              {scoutEarlier.map((atBat) => renderCompletedRow(atBat))}
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
            {splitHandle}
            <div className="pbpv2__earlier" ref={liveEarlierRef} style={{ height: splitEarlierPx }}>
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
              const isFuture = markerAtBatIndex != null && atBat.atBatIndex > markerAtBatIndex;
              const isCurrent = markerAtBatIndex != null && atBat.atBatIndex === markerAtBatIndex;
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
                      : (() => {
                          const runnerAdvances = runnerFinalBaseByAtBat?.get(atBat.atBatIndex);
                          const runnerFinal = runnerAdvances != null && runnerAdvances.length > 0 ? runnerAdvances[runnerAdvances.length - 1].base : undefined;
                          const cellProps = playResultToCellProps(atBat.result, atBat.scorebookCode);
                          const scored = atBat.result === 'HomeRun'
                            || scoredByAtBatIndex.has(atBat.atBatIndex)
                            || (runnerFinal != null && runnerFinal >= 4);
                          return <ScorebookCell codeIn {...cellProps} finalBase={runnerFinal ?? cellProps.finalBase} scored={scored} width={40} />;
                        })()
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
      <div className={`pbpv2__scorecard-slide${flipped ? " pbpv2__scorecard-slide--open" : ""}`}>
        <div
          ref={scorecardViewRef}
          className="pbpv2__scorecard-viewport"
          onPointerDown={onScorecardPointerDown}
          onPointerMove={onScorecardPointerMove}
          onPointerUp={onScorecardPointerUp}
          onPointerLeave={onScorecardPointerUp}
          onTouchStart={onScorecardTouchStart}
          onTouchMove={onScorecardTouchMove}
          onTouchEnd={onScorecardTouchEnd}
          onClick={(e) => {
            const cell = (e.target as Element).closest('[data-runner-ab]');
            if (cell == null) return;
            const idx = Number(cell.getAttribute('data-runner-ab'));
            if (!Number.isNaN(idx)) setTraceAtBatIdx(idx);
          }}
        >
          <div ref={scorecardContentRef} className="pbpv2__scorecard-content">
            <div style={{ opacity: scorecardFading ? 0 : 1, transition: 'opacity 150ms ease' }}>
            {/* Game meta — travels with the grid when panned */}
            <div className="pbpv2__scorecard-meta">
              <span className="pbpv2__scorecard-meta-matchup">
                <TeamMark logoUrl={awayLogoUrl} abbr={awayAbbr} size={18} />
                {game?.awayName ?? awayAbbr}
                {" @ "}
                <TeamMark logoUrl={homeLogoUrl} abbr={homeAbbr} size={18} />
                {game?.homeName ?? homeAbbr}
              </span>
              {scorecardGameDate != null && (
                <span className="pbpv2__scorecard-meta-date num">{scorecardGameDate}</span>
              )}
              {scorecardVenue != null && (
                <span className="pbpv2__scorecard-meta-venue">{scorecardVenue}</span>
              )}
            </div>
            <ScorecardGrid
              side={scorecardTeam ?? (currentAtBat?.half === "top" ? "away" : "home")}
              boxScore={boxScore}
              completedAtBats={completedAtBats}
              currentAtBat={currentAtBat}
              orderByBatter={orderByBatter}
              scoringByAtBat={scoringByAtBat}
              runnerFinalBaseByAtBat={runnerFinalBaseByAtBat}
              providerGameId={game?.providerGameId}
              logoUrl={scorecardLogoUrl}
              teamName={scorecardTeamName}
              opponent={scorecardOpponent}
              gameDate={scorecardGameDate}
              venue={scorecardVenue}
              selectedRunnerAbIdx={traceAtBatIdx}
              hoveredAbIdx={traceHoveredAbIdx}
            />
            </div>
          </div>
        </div>
        {traceAtBatIdx != null && runnerFinalBaseByAtBat != null && (
          <RunnerTracePanel
            runnerAtBatIndex={traceAtBatIdx}
            completedAtBats={completedAtBats}
            runnerFinalBaseByAtBat={runnerFinalBaseByAtBat}
            onClose={handleTraceClose}
            closing={traceClosing}
            hoveredAbIdx={traceHoveredAbIdx}
            onEventHover={setTraceHoveredAbIdx}
          />
        )}
      </div>
      </div>{/* closes .pbpv2__content-area */}
    </div>{/* closes .pbpv2 */}
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
