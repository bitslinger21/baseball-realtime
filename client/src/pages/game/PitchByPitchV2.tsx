import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { BoxScoreDto, GameViewDto } from "@bitslinger21/scorebook-client";
import type { AtBatState } from "../../components/AtBatCard/atBatTypes";
import { IQDiamond } from "../../components/primitives/IQDiamond";
import { OrderSpot } from "../../components/primitives/OrderSpot";
import { LivePill, Pill } from "../../components/primitives/Pill";
import { ScorebookCell } from "../../components/primitives/ScorebookCell";
import { Segmented } from "../../components/primitives/Segmented";
import { Th, Td } from "../../components/primitives/Table";
import { WatchButton } from "../../components/primitives/WatchButton";
import { TEAMS } from "../../utils/teams";
import "./PitchByPitchV2.css";
import "./ScoutControls.css";
import { ClipInPlace } from "./ClipInPlace";
import type { ClipIndexWire, ClipWire } from "./clipTypes";
import { RunnerTracePanel } from "./RunnerTracePanel";
import { ScorecardFullCard } from "./ScorecardFullCard";
import { ScoutTimeline } from "./ScoutTimeline";
import { ScoutTransport } from "./ScoutTransport";
import { DIAMOND_CORNERS, diamondSegPath, getInitialBase, TRACE_ORIGIN_COLOR } from "./diamondCoords";
import type { DueUpNext } from "./halfInningTransition";

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
    case 'CatcherInterference': return 'CI';
    case 'Strikeout': return 'K';
    case 'SacFly': return 'SF';
    case 'SacBunt': return 'SH';
    case 'Error': return scorebookCode ?? 'E';
    case 'FieldersChoice': return scorebookCode ?? 'FC';
    case 'DoublePlay': return scorebookCode ?? 'DP';
    case 'TriplePlay': return scorebookCode ?? 'TP';
    case 'CaughtStealing': return 'CS';
    case 'Pickoff': return 'PO';
    case 'StolenBase': return 'SB';
    case 'Groundout': case 'Flyout': case 'Lineout': case 'PopOut': case 'Out':
      return scorebookCode ?? 'OUT';
    default: return result != null ? (scorebookCode ?? '●') : '●';
  }
}


// Every value of the backend's playResult enum (poller.service.ts →
// PlayResult), plus the legacy names, so no row reads a raw enum.
function playResultToLabel(result: string | undefined, scorebookCode?: string): string {
  // A forceout arrives as Groundout with an FC code (F-006 A2): MLB's own word.
  if (result === 'Groundout' && scorebookCode === 'FC') return 'Forceout';
  switch (result) {
    case 'HomeRun': return 'Home run';
    case 'Triple': return 'Triple';
    case 'Double': return 'Double';
    case 'Single': return 'Single';
    case 'Walk': return 'Walk';
    case 'IntentionalWalk': return 'Intentional walk';
    case 'HBP':
    case 'HitByPitch': return 'Hit by pitch';
    case 'Strikeout': return 'Strikeout';
    case 'Groundout': return 'Groundout';
    case 'Flyout': return 'Flyout';
    case 'Lineout': return 'Lineout';
    case 'PopOut': return 'Pop out';
    case 'Out': return 'Out';
    case 'FieldersChoice': return "Fielder's choice";
    case 'DoublePlay': return 'Double play';
    case 'TriplePlay': return 'Triple play';
    case 'SacFly': return 'Sac fly';
    case 'SacBunt': return 'Sac bunt';
    case 'CatcherInterference': return "Catcher's interference";
    case 'Error': return 'Reached on error';
    case 'CaughtStealing': return 'Caught stealing';
    case 'Pickoff': return 'Picked off';
    case 'StolenBase': return 'Stolen base';
    default: return 'Play';
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
    // Reaches first, but not a hit.
    case 'CatcherInterference': return { code: 'CI', kind: 'fc', reachedOnPA: 1, finalBase: 1 };
    default: {
      const code = playResultToCode(result, scorebookCode);
      // A forceout (Groundout + FC code): the batter is safe at first — drawn
      // like a hit, the code carries the difference (F-006 A2/B2).
      if (code === 'FC') return { code, kind: 'fc', reachedOnPA: 1, finalBase: 1 };
      return { code, kind: 'out', reachedOnPA: 0, finalBase: 0 };
    }
  }
}

// The last recorded stop for a runner tracked via runnerFinalBaseByAtBat — and
// whether that stop was a safe advance or a retirement (caught stealing, FC
// force). Callers must route this to ScorebookCell's `outAt` prop, not
// `finalBase` — the map's `base` field is populated either way, so reading it
// without checking `isOut` would draw an out as if it were a successful advance.
function lastRunnerStop(
  entries: ReadonlyArray<{ base: number; isOut?: boolean }> | undefined,
): { base?: number; isOut: boolean } {
  if (entries == null || entries.length === 0) return { isOut: false };
  const last = entries[entries.length - 1];
  return { base: last.base, isOut: last.isOut === true };
}

function halfLabel(half: "top" | "bottom", inning: number): string {
  return `${half === "top" ? "TOP" : "BOT"} ${inning}`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
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

// Scorecard cells at ~0.8 of print (90 × 77) so more innings fit the card
// (PROMPT_scorecard_frozen.md §2). Print / scorebook-page.html stay at 1.
const SCORECARD_CELL_SCALE = 0.8;
// The runner-trace panel's width; it covers the right side of the viewport.
const TRACE_PANEL_W = 350;
// Glide time for the ‹ › inning chevrons.
const INNING_GLIDE_MS = 320;

// ScorecardGrid — thin wrapper around window.buildScorebookGrid. Derives lineup/pitchers
// from boxScore (roster/stats) crossed with the live feed (per-inning cell results).
// Rendered into a plain div; the builder does all DOM work imperatively.
function ScorecardGrid({
  side, boxScore, completedAtBats, currentAtBat, orderByBatter, scoringByAtBat, runnerFinalBaseByAtBat, providerGameId,
  logoUrl, teamName, opponent, nickname, oppNickname, oppLogoUrl, gameDate, venue, selectedRunnerAbIdx, hoveredAbIdx,
  awayName, awayLogoUrl, homeName, homeLogoUrl, clipAtBatIndexes,
  cellScale = SCORECARD_CELL_SCALE, frozen = true, plain = false, asOfHead = false,
}: {
  /** Scout: the lineup as of the play head — a sub appears (and his starter
   *  mutes) only once he has batted at or before the head, not as the
   *  end-of-game box score has it. */
  asOfHead?: boolean;
  /** A plain scoresheet with no live highlights — the in-app print. */
  plain?: boolean;
  /** Cell size as a fraction of print; the full card passes its fitted scale. */
  cellScale?: number;
  /** Sticky edges for the in-page scrolling viewport; the full card doesn't scroll. */
  frozen?: boolean;
  side: "home" | "away";
  boxScore?: BoxScoreDto | null;
  completedAtBats: AtBatState[];
  currentAtBat: AtBatState | null;
  orderByBatter?: ReadonlyMap<number, number>;
  scoringByAtBat?: ReadonlyMap<number, ScoringInfo>;
  runnerFinalBaseByAtBat?: ReadonlyMap<number, ReadonlyArray<{ base: number; advancedByAtBatIndex?: number; isOut?: boolean; label?: string }>>;
  providerGameId?: string | null;
  logoUrl?: string | null;
  teamName?: string | null;
  opponent?: string | null;
  /** Header corners: `Batting · {nickname}` over the batters, `Pitching · {oppNickname}` over the opposing pitchers. */
  nickname?: string | null;
  oppNickname?: string | null;
  oppLogoUrl?: string | null;
  gameDate?: string | null;
  venue?: string | null;
  selectedRunnerAbIdx?: number | null;
  hoveredAbIdx?: number | null;
  awayName?: string | null;
  awayLogoUrl?: string | null;
  homeName?: string | null;
  homeLogoUrl?: string | null;
  clipAtBatIndexes?: ReadonlySet<number>;
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
      ':root{--bg:#f4f1ea;--surface:#fcfaf6;--surfaceAlt:#efeae0;--ink:#15161a;--accent:#b8421e;' +
      '--border:#cfc8b4;--borderStrong:#b4ae9b;--textFaint:#6f685f;--textMuted:#5c574f}' +
      cellCss;
    document.head.appendChild(st);
  }, []);

  const sideHalf: "top" | "bottom" = side === "away" ? "top" : "bottom";
  const boxSide = boxScore?.[side];

  const allABs = [...completedAtBats, ...(currentAtBat != null ? [currentAtBat] : [])];
  // Finished at-bats, including a current one that already has its result
  // (Scout's head on an at-bat's final pitch) — drawn as done, not live.
  const doneABs = currentAtBat?.result != null ? [...completedAtBats, currentAtBat] : completedAtBats;

  // Compute per-AB out number (1/2/3) and half-end marker for this side's completed ABs.
  const BATTER_OUT_RESULTS = new Set([
    'Strikeout', 'Groundout', 'Flyout', 'Lineout', 'PopOut', 'Out',
    'SacFly', 'SacBunt', 'DoublePlay', 'TriplePlay', 'CaughtStealing', 'Pickoff',
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
    doneABs
      .filter(ab => ab.half === sideHalf && ab.isHalfEnd)
      .map(ab => ab.atBatIndex),
  );
  const sideCompletedByInn = new Map<number, AtBatState[]>();
  for (const ab of doneABs) {
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

  // Who on this side has batted at or before the head (Scout's lineup as of the head).
  const battedByHead = new Set<number>(allABs.filter(ab => ab.half === sideHalf).map(ab => ab.batterId));

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
    // In Scout the box score is the END of the game; show a substitute only once
    // he has batted at or before the head, so his starter isn't muted before he
    // was replaced. (A sub who entered without batting shows from his first PA.)
    const subs = asOfHead ? players.slice(1).filter(b => b.playerId != null && battedByHead.has(b.playerId)) : players.slice(1);
    const ownPAs = allABs.filter(ab => ab.half === sideHalf && orderByBatter?.get(ab.batterId) === order);
    type CellEntry = { code?: string; live?: boolean; balls?: number; strikes?: number; result?: string; isLooking?: boolean; outNum?: number; halfEnd?: boolean; advances?: { base: number; label: string; isOut?: boolean }[]; atBatIndex?: number; hasClip?: boolean; spray?: AtBatState['spray']; sub?: string };
    const cellsByInn: Record<number, CellEntry[]> = {};
    ownPAs.forEach(ab => {
      if (ab === currentAtBat && ab.result == null) {
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
          // An error behind the move labels it 'E6' / 'E6T' (F-006 A3); a runner
          // put out gets only the × (B3) — no label.
          const label = a.isOut ? '' : a.label ?? (jerseyNo != null ? `#${jerseyNo}` : '');
          return { base: a.base, label, isOut: a.isOut === true };
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
          hasClip: clipAtBatIndexes?.has(ab.atBatIndex) ?? false,
          spray: ab.spray,
          sub: ab.scorebookSub,
        };
        cellsByInn[ab.inning] = [...(cellsByInn[ab.inning] ?? []), entry];
      }
    });
    // Derive tally stats from completed at-bats (accurate at any play-head position).
    const starterPAs = doneABs.filter(
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
  const ownPAsCompleted = doneABs.filter(ab => ab.half === sideHalf);
  const pitchers = (oppBoxSide?.pitching ?? []).slice(0, 4).map(p => {
    const cellsByInn: Record<number, { r: number; h: number; k: number; bb: number }> = {};
    for (let inn = 1; inn <= numInnings; inn++) {
      // Credit each plate appearance to the pitcher who actually faced it —
      // not the whole inning's totals to every pitcher who ever threw that
      // inning. Ownership is per-PA, so a mid-inning change splits correctly
      // (PROMPT_scorecard_pitcher_tallies.md). R is charged to the pitcher on
      // the mound for that PA, not necessarily whoever put an inherited
      // runner on base — a known, accepted simplification (the feed carries
      // no separate "responsible pitcher for this run" field).
      const innPAs = ownPAsCompleted.filter(ab => ab.inning === inn && ab.pitcherName === p.name);
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


  // The live inning's header and the current batter's name row are rust — on the
  // batting side's card only (PROMPT_scorecard_frozen.md §1).
  const liveHere = currentAtBat != null && currentAtBat.half === sideHalf;
  const liveOrder = liveHere ? orderByBatter?.get(currentAtBat.batterId) : undefined;
  // The rust row is whoever is actually at the plate: the starter's row (0) or
  // a sub's (1-2), matched on the live at-bat's batterId. -1 = not on the
  // sheet (a third sub, or the box score hasn't caught up) — no row lit, and a
  // replaced starter is never lit in his place (PROMPT_scorecard_frozen.md rev 2).
  const liveEntry = liveOrder != null ? lineup[liveOrder - 1] : undefined;
  const liveRow = liveEntry == null || !liveHere
    ? -1
    : liveEntry.playerId === currentAtBat.batterId
      ? 0
      : (() => {
          const i = liveEntry.subs.findIndex((s) => s.playerId === currentAtBat.batterId);
          return i >= 0 && i < 2 ? i + 1 : -1;
        })();

  useEffect(() => {
    const grid = ref.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const build = (window as any).buildScorebookGrid;
    if (grid != null && build != null) build(grid, {
      lineup, pitchers, numInnings, gameId: providerGameId, teamAbbr: boxSide?.teamAbbr, logoUrl, teamName, opponent, nickname, oppNickname, oppLogoUrl, gameDate, venue,
      // The away @ home · date · venue band is for the printed sheet only.
      away: plain ? { name: awayName, logo: awayLogoUrl } : null,
      home: plain ? { name: homeName, logo: homeLogoUrl } : null,
      // Fit the card: ~0.8 cells, frozen names / totals / inning header.
      cellScale,
      frozen,
      plain,
      // The live inning is the game's — rust on both teams' sheets; the batter
      // row and live cell are the batting team's alone (PROMPT_oct19.md §6).
      liveInning: currentAtBat != null ? currentAtBat.inning : null,
      liveSlot: liveOrder != null ? liveOrder - 1 : null,
      liveRow,
    });
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

type TeamMeta = { logoUrl?: string | null; name?: string | null };

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
  runMarkers: { idx: number; team: "away" | "home"; count: number; label?: string }[];
  halfInnings: { idx: number; half: "top" | "bottom"; inning: number }[];
}

interface PitchByPitchV2Props {
  completedAtBats: AtBatState[];
  currentAtBat: AtBatState | null;
  game?: GameViewDto | null;
  boxScore?: BoxScoreDto | null;
  scoringByAtBat?: ReadonlyMap<number, ScoringInfo>;
  runnerFinalBaseByAtBat?: ReadonlyMap<number, ReadonlyArray<{ base: number; advancedByAtBatIndex?: number; isOut?: boolean; label?: string }>>;
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
  /** Scorecard mode: the frame height the sheet needs to show every row without
   *  scrolling. The page uses it to size the hero row (scorecard_pregame_fixes §1). */
  onScorecardNeed?: (height: number) => void;
  /** Between the 3rd out and the next half's first pitch — pre-stages the
      incoming at-bat instead of leaving the finished batter pinned with a
      stale LIVE pill. Same batter the Due Up tile leads with (one answer,
      two places). See PROMPT_half_inning_transition.md §3g. */
  dueUpNext?: DueUpNext | null;
  /** This game's play → clip mapping, already scout-gated by the caller — drives
   *  the Watch buttons and scorecard marks (PROMPT_video_clips.md). */
  clips?: readonly ClipIndexWire[];
  /** The full clip list for the in-box player; loaded on demand, so it can lag
   *  the index (PROMPT_highlights_lazy.md). */
  playerClips?: readonly ClipWire[];
  playingClipId?: string | null;
  onPlayClip?: (clipId: string) => void;
  onCloseClip?: () => void;
}

export function PitchByPitchV2({ completedAtBats, currentAtBat, game, boxScore, scoringByAtBat, runnerFinalBaseByAtBat, orderByBatter, isReplayMode = false, scoutMode = false, allCompletedAtBats, markerAtBatIndex, onSeek, scoutControls, flipped: flippedProp, onFlipChange, onScorecardNeed, dueUpNext = null, clips = [], playerClips = [], playingClipId = null, onPlayClip, onCloseClip }: PitchByPitchV2Props): ReactElement {
  const clipByAtBatIndex = useMemo(() => {
    const m = new Map<number, ClipIndexWire>();
    for (const c of clips) if (c.atBatIndex != null) m.set(c.atBatIndex, c);
    return m;
  }, [clips]);
  const clipAtBatIndexSet = useMemo(() => new Set(clipByAtBatIndex.keys()), [clipByAtBatIndex]);
  const [filterIdx] = useState(0);
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

  // Scorecard mode opens on the team at bat at the head; before the first
  // pitch that's the away team (top of the 1st). The toggle holds until the
  // user leaves; reopening picks the team at bat again.
  useEffect(() => {
    if (flipped) setScorecardTeam(currentAtBat?.half === "bottom" ? "home" : "away");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);

  // Auto-switch scorecard to the batting team when the half-inning changes.
  const prevHalfRef = useRef<"top" | "bottom" | null>(null);
  useEffect(() => {
    const h = currentAtBat?.half ?? null;
    if (h != null && h !== prevHalfRef.current) {
      prevHalfRef.current = h;
      setScorecardTeam(h === "top" ? "away" : "home");
    }
  }, [currentAtBat?.half]);
  // The scorecard fits the card: a native scroll viewport where the builder's
  // sticky name columns, totals and inning header stay put and only the innings
  // slide between them — trackpad swipe, Shift + wheel and touch all come from
  // the browser (PROMPT_scorecard_frozen.md §3). No zoom, no drag-pan.
  const scorecardViewRef = useRef<HTMLDivElement>(null);
  const flippedRef = useRef(flipped);
  flippedRef.current = flipped;

  // The builder's layout, from the grid's data attributes.
  function scorecardLayout(): { view: HTMLDivElement; iw: number; win: number; maxLeft: number; innings: number } | null {
    const view = scorecardViewRef.current;
    const grid = view?.querySelector<HTMLElement>("[data-inn-w]");
    if (view == null || grid == null) return null;
    const iw = Number(grid.dataset.innW);
    const win = view.clientWidth - Number(grid.dataset.leftW) - Number(grid.dataset.rightW);
    return { view, iw, win, maxLeft: Math.max(0, view.scrollWidth - view.clientWidth), innings: Number(grid.dataset.innings) };
  }

  // "Innings 3–8 of 9": an inning counts once at least a quarter of it shows.
  const [inningWindow, setInningWindow] = useState<{ first: number; last: number; innings: number; all: boolean; canPrev: boolean; canNext: boolean } | null>(null);
  const readInningWindow = useCallback((): void => {
    const l = scorecardLayout();
    if (l == null || !(l.iw > 0)) return;
    const left = l.view.scrollLeft;
    const first = Math.min(l.innings, Math.floor(left / l.iw + 0.25) + 1);
    const last = Math.max(first, Math.min(l.innings, Math.ceil((left + l.win) / l.iw - 0.25)));
    const next = { first, last, innings: l.innings, all: l.maxLeft <= 1, canPrev: left > 0.5, canNext: left < l.maxLeft - 0.5 };
    setInningWindow((prev) =>
      prev != null && prev.first === next.first && prev.last === next.last && prev.innings === next.innings &&
      prev.all === next.all && prev.canPrev === next.canPrev && prev.canNext === next.canNext ? prev : next);
  }, []);

  // Opening position: the live inning second from the right, so the next one is
  // in view. It stays anchored there while the card resizes — the game page
  // widens its column over 1.2s as the scorecard opens — until the user moves
  // the innings themselves.
  const anchorLiveRef = useRef(false);
  const liveInningRef = useRef<number | null>(null);
  liveInningRef.current = currentAtBat?.inning ?? null;
  const placeLiveInning = useCallback((): void => {
    const l = scorecardLayout();
    if (l == null) return;
    const inn = liveInningRef.current;
    l.view.scrollLeft = inn != null ? Math.max(0, Math.min(l.maxLeft, (inn + 1) * l.iw - l.win)) : 0;
  }, []);

  // Keep the label current on scroll (rAF-throttled) and when the card resizes.
  useEffect(() => {
    if (!flipped) return;
    const view = scorecardViewRef.current;
    if (view == null) return;
    let raf = 0;
    const onScroll = (): void => {
      if (raf !== 0) return;
      raf = requestAnimationFrame(() => { raf = 0; readInningWindow(); });
    };
    const onResize = (): void => {
      if (anchorLiveRef.current) placeLiveInning();
      onScroll();
    };
    const release = (): void => { anchorLiveRef.current = false; };
    view.addEventListener("scroll", onScroll, { passive: true });
    for (const ev of ["wheel", "touchstart", "pointerdown", "keydown"] as const) {
      view.addEventListener(ev, release, { passive: true });
    }
    const ro = new ResizeObserver(onResize);
    ro.observe(view);
    return () => {
      view.removeEventListener("scroll", onScroll);
      for (const ev of ["wheel", "touchstart", "pointerdown", "keydown"] as const) {
        view.removeEventListener(ev, release);
      }
      ro.disconnect();
      if (raf !== 0) cancelAnimationFrame(raf);
    };
  }, [flipped, readInningWindow, placeLiveInning]);

  // Animated scrollLeft — scrollTo({behavior:'smooth'}) is a silent no-op in
  // some real environments (PROMPT_home_layout.md PR B), so glide with rAF.
  const glideRef = useRef(0);
  function glideScorecardTo(target: number): void {
    const view = scorecardViewRef.current;
    if (view == null) return;
    cancelAnimationFrame(glideRef.current);
    const from = view.scrollLeft;
    const t0 = performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - t0) / INNING_GLIDE_MS);
      const ease = 1 - Math.pow(1 - t, 3);
      view.scrollLeft = from + (target - from) * ease;
      if (t < 1) glideRef.current = requestAnimationFrame(step);
    };
    glideRef.current = requestAnimationFrame(step);
  }

  // ‹ › glide to the next inning boundary — the fallback for a plain mouse.
  function stepInning(dir: -1 | 1): void {
    const l = scorecardLayout();
    if (l == null || !(l.iw > 0)) return;
    anchorLiveRef.current = false;
    const at = l.view.scrollLeft / l.iw;
    const target = (dir > 0 ? Math.floor(at + 0.01) + 1 : Math.ceil(at - 0.01) - 1) * l.iw;
    glideScorecardTo(Math.max(0, Math.min(l.maxLeft, target)));
  }

  // Re-place (and re-anchor) on flip-open, team toggle and half-inning change.
  const scorecardHalfKey = currentAtBat != null ? `${currentAtBat.inning}-${currentAtBat.half}` : "";
  useEffect(() => {
    if (!flipped) return;
    cancelAnimationFrame(glideRef.current);
    anchorLiveRef.current = true;
    placeLiveInning();
    readInningWindow();
  }, [flipped, scorecardTeam, scorecardHalfKey, placeLiveInning, readInningWindow]);

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
      // Direct assignment, not scrollTo({behavior:'smooth'}) — a silent no-op
      // in some real environments (PROMPT_home_layout.md PR B). Loses the
      // glide-back animation but guarantees the row actually resets.
      requestAnimationFrame(() => { el.scrollTop = 0; });
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
  const scorecardEffSide = scorecardTeam ?? (currentAtBat?.half === "bottom" ? "home" : "away");
  const scorecardGameDate = game?.gameDate
    ? new Date(`${game.gameDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).replace(",", "")
    : null;
  const scorecardVenue = (game?.snapshot as { venue?: string } | null | undefined)?.venue ?? null;

  // Full card — the scorecard popped out over the page (PROMPT_scorecard_frozen.md §5).
  // The in-page card stays put as its placeholder.
  const [fullCard, setFullCard] = useState(false);
  // Scorecard mode: report the frame height that shows the whole sheet — the
  // frame now, plus whatever the sheet still scrolls vertically. Re-measured as
  // the sheet changes (team toggle, subs, the head moving).
  const onScorecardNeedRef = useRef(onScorecardNeed);
  onScorecardNeedRef.current = onScorecardNeed;
  useEffect(() => {
    const view = scorecardViewRef.current;
    const frame = pbpv2FrameRef.current;
    if (!flipped || view == null || frame == null) return;
    const measure = (): void => {
      onScorecardNeedRef.current?.(frame.offsetHeight + view.scrollHeight - view.clientHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(view);
    if (view.firstElementChild != null) ro.observe(view.firstElementChild);
    return () => ro.disconnect();
  }, [flipped]);

  const fullCardPlaceholder = useCallback((): HTMLElement | null => pbpv2FrameRef.current, []);
  const closeFullCard = useCallback((): void => setFullCard(false), []);
  useEffect(() => { if (!flipped) setFullCard(false); }, [flipped]);
  // A team's innings on its sheet (extra innings beyond 9).
  const scorecardInningsFor = (s: "away" | "home"): number =>
    [...completedAtBats, ...(currentAtBat != null ? [currentAtBat] : [])]
      .filter((ab) => ab.half === (s === "away" ? "top" : "bottom"))
      .reduce((max, ab) => Math.max(max, ab.inning), 9);

  // Clip ▶ and runner taps on either copy of the sheet.
  function onScorecardClick(e: React.MouseEvent<HTMLDivElement>): void {
    const clipEl = (e.target as Element).closest('[data-clip-pa]');
    if (clipEl != null) {
      const abIdx = Number(clipEl.getAttribute('data-clip-pa'));
      const clip = Number.isNaN(abIdx) ? undefined : clipByAtBatIndex.get(abIdx);
      if (clip != null) onPlayClip?.(clip.id);
      return;
    }
    const cell = (e.target as Element).closest('[data-runner-ab]');
    if (cell == null) return;
    const idx = Number(cell.getAttribute('data-runner-ab'));
    if (!Number.isNaN(idx)) setTraceAtBatIdx(idx);
  }

  function renderScorecardSheet(cellScale?: number, frozen?: boolean, side: "away" | "home" = scorecardEffSide, plain = false): ReactElement {
    const teamName = side === "away" ? (game?.awayName ?? awayAbbr) : (game?.homeName ?? homeAbbr);
    const opponent = side === "away" ? (game?.homeName ?? homeAbbr) : (game?.awayName ?? awayAbbr);
    // Header corners: nickname + the TeamDot logo (Oct 22). The card is its
    // batters plus the OPPOSING pitchers they faced.
    const ownAbbr = side === "away" ? awayAbbr : homeAbbr;
    const oppAbbr = side === "away" ? homeAbbr : awayAbbr;
    const nick = (abbr: string, meta: TeamMeta | null | undefined): string => TEAMS[abbr]?.short ?? meta?.name ?? abbr;
    const logoOf = (abbr: string, fallback: string | null): string | null =>
      TEAMS[abbr] != null ? `https://www.mlbstatic.com/team-logos/${TEAMS[abbr].id}.svg` : fallback;
    const logo = logoOf(ownAbbr, side === "away" ? awayLogoUrl : homeLogoUrl);
    return (
      <ScorecardGrid
        side={side}
        boxScore={boxScore}
        completedAtBats={completedAtBats}
        currentAtBat={currentAtBat}
        orderByBatter={orderByBatter}
        scoringByAtBat={scoringByAtBat}
        runnerFinalBaseByAtBat={runnerFinalBaseByAtBat}
        providerGameId={game?.providerGameId}
        logoUrl={logo}
        teamName={teamName}
        opponent={opponent}
        nickname={nick(ownAbbr, (side === "away" ? awayMeta : homeMeta) as TeamMeta | null | undefined)}
        oppNickname={nick(oppAbbr, (side === "away" ? homeMeta : awayMeta) as TeamMeta | null | undefined)}
        oppLogoUrl={logoOf(oppAbbr, side === "away" ? homeLogoUrl : awayLogoUrl)}
        gameDate={scorecardGameDate}
        venue={scorecardVenue}
        awayName={game?.awayName ?? awayAbbr}
        awayLogoUrl={awayLogoUrl}
        homeName={game?.homeName ?? homeAbbr}
        homeLogoUrl={homeLogoUrl}
        selectedRunnerAbIdx={traceAtBatIdx}
        hoveredAbIdx={traceHoveredAbIdx}
        clipAtBatIndexes={clipAtBatIndexSet}
        cellScale={cellScale}
        frozen={frozen}
        plain={plain}
        // At the game's last pitch the end-of-game box score is the truth —
        // it also has the subs who came in without batting.
        asOfHead={scoutMode && scoutControls != null && scoutControls.markerMoment < scoutControls.totalMoments}
      />
    );
  }

  const scorecardTeamToggle = (
    <Segmented
      items={[awayAbbr, homeAbbr]}
      active={scorecardTeam === "home" ? 1 : 0}
      onClick={(i) => switchScorecardTeam(i === 0 ? "away" : "home")}
      size="sm"
    />
  );

  const tracePanel = traceAtBatIdx != null && runnerFinalBaseByAtBat != null ? (
    <RunnerTracePanel
      runnerAtBatIndex={traceAtBatIdx}
      completedAtBats={completedAtBats}
      runnerFinalBaseByAtBat={runnerFinalBaseByAtBat}
      onClose={handleTraceClose}
      closing={traceClosing}
      hoveredAbIdx={traceHoveredAbIdx}
      onEventHover={setTraceHoveredAbIdx}
    />
  ) : null;

  // Mounts once the full list holds the clip being played (it's fetched on the first play).
  const clipPlayer = playingClipId != null && onCloseClip != null && playerClips.some((c) => c.id === playingClipId) ? (
    <ClipInPlace
      clips={[...playerClips]}
      activeId={playingClipId}
      onPick={(id) => onPlayClip?.(id)}
      onClose={onCloseClip}
    />
  ) : null;

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

  // Scout: the past (Earlier) at-bats before the head
  const scoutAllABs = allCompletedAtBats ?? completedAtBats;
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
      // The scorecard scrolls natively; stepping the head here would eat its
      // vertical scroll and sideways swipe.
      if (flippedRef.current) return;
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


  // Auto-scroll the scorecard so every highlighted cell (origin + every
  // movement/driver cell) sits between the frozen name columns and the 350px
  // trace panel — not just the origin. A trace can span several innings; if
  // the full span can't fit, prioritise the origin and the final movement and
  // let the middle scroll off, per PROMPT_runner_trace.md §5. The panel covers
  // the frozen totals; that's fine (PROMPT_scorecard_frozen.md §4).
  useEffect(() => {
    if (traceAtBatIdx == null || !flipped) return;
    const tid = setTimeout(() => {
      const viewEl = scorecardViewRef.current;
      const grid = viewEl?.querySelector<HTMLElement>("[data-inn-w]");
      if (viewEl == null || grid == null) return;

      const advances = runnerFinalBaseByAtBat?.get(traceAtBatIdx) ?? [];
      const driverIdxs = advances
        .map((a) => a.advancedByAtBatIndex)
        .filter((x): x is number => x != null);
      const allIdxs = [traceAtBatIdx, ...driverIdxs];
      const cellsAll = allIdxs
        .map((idx) => viewEl.querySelector(`[data-ab-idx="${idx}"]`) as HTMLElement | null)
        .filter((c): c is HTMLElement => c != null);
      if (cellsAll.length === 0) return;

      const viewRect = viewEl.getBoundingClientRect();
      // The clear band, in viewport coordinates: right of the frozen name
      // columns, left of the panel; below the sticky inning header.
      const clearLeft = Number(grid.dataset.leftW);
      const clearRight = viewRect.width - TRACE_PANEL_W;
      const clearWidth = clearRight - clearLeft;
      const headRow = grid.querySelector<HTMLElement>("[data-inn-head]");
      const clearTop = headRow != null ? headRow.getBoundingClientRect().height : 0;

      const spanOf = (cells: HTMLElement[]): { left: number; right: number; top: number; bottom: number } => {
        let left = Infinity;
        let right = -Infinity;
        let top = Infinity;
        let bottom = -Infinity;
        for (const c of cells) {
          const r = c.getBoundingClientRect();
          left = Math.min(left, r.left - viewRect.left);
          right = Math.max(right, r.right - viewRect.left);
          top = Math.min(top, r.top - viewRect.top);
          bottom = Math.max(bottom, r.bottom - viewRect.top);
        }
        return { left, right, top, bottom };
      };

      let span = spanOf(cellsAll);
      if (span.right - span.left > clearWidth - 16 && cellsAll.length > 2) {
        const originCell = viewEl.querySelector(`[data-ab-idx="${traceAtBatIdx}"]`) as HTMLElement | null;
        const lastDriverIdx = driverIdxs[driverIdxs.length - 1];
        const lastCell = lastDriverIdx != null
          ? (viewEl.querySelector(`[data-ab-idx="${lastDriverIdx}"]`) as HTMLElement | null)
          : null;
        const priorityCells = [originCell, lastCell].filter((c): c is HTMLElement => c != null);
        if (priorityCells.length > 0) span = spanOf(priorityCells);
      }

      if (span.right > clearRight - 8) {
        viewEl.scrollLeft += span.right - clearRight + 32;
      } else if (span.left < clearLeft + 8) {
        viewEl.scrollLeft -= clearLeft + 8 - span.left;
      }
      if (span.bottom > viewRect.height - 8) {
        viewEl.scrollTop += Math.min(span.bottom - viewRect.height + 8, span.top - clearTop - 8);
      } else if (span.top < clearTop + 8) {
        viewEl.scrollTop -= clearTop + 8 - span.top;
      }
    }, 50);
    return () => clearTimeout(tid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traceAtBatIdx, flipped]);

  function flipToScorecard(): void {
    setFlipped(true);
  }

  // Shared collapsed-row renderer — used in both canvas "Earlier" zone and old layout.
  // Scout mode has no accordion model: one marker the whole screen reflects, so a
  // click here SEEKS instead of expanding in place (PROMPT_scout_earlier_ab_seek.md).
  function renderCompletedRow(atBat: AtBatState): ReactElement {
    const isOpen = expanded.has(atBat.atBatIndex);
    const hasPitches = atBat.pitches.length > 0;
    const scoring = scoringByAtBat?.get(atBat.atBatIndex) ?? null;
    const handleRowClick = scoutMode
      ? () => onSeek?.(atBat.atBatIndex)
      : (hasPitches ? () => toggle(atBat.atBatIndex) : undefined);
    return (
      <div key={atBat.atBatIndex} className="pbpv2__pa pbpv2__pa--normal" data-ab-inning={atBat.inning}>
        <div
          className="pbpv2__pa-header"
          onClick={handleRowClick}
          style={scoutMode ? { cursor: "pointer" } : (!hasPitches ? { cursor: "default" } : undefined)}
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
            const { base: runnerFinal, isOut: runnerOut } = lastRunnerStop(runnerFinalBaseByAtBat?.get(atBat.atBatIndex));
            const cellProps = playResultToCellProps(atBat.result, atBat.scorebookCode);
            const scored = atBat.result === 'HomeRun'
              || scoredByAtBatIndex.has(atBat.atBatIndex)
              || (!runnerOut && runnerFinal != null && runnerFinal >= 4);
            return (
              <ScorebookCell
                codeIn
                {...cellProps}
                finalBase={runnerOut ? undefined : (runnerFinal ?? cellProps.finalBase)}
                outAt={runnerOut ? runnerFinal : undefined}
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
                  · {playResultToLabel(atBat.result, atBat.scorebookCode)}
                  {atBat.finalCount != null && (
                    <span className="num"> · {atBat.finalCount}</span>
                  )}
                </span>
              </>
            )}
            {scoring != null && <ScoringChip info={scoring} />}
          </div>

          {(() => {
            const clip = clipByAtBatIndex.get(atBat.atBatIndex);
            if (clip == null || onPlayClip == null) return null;
            return (
              <WatchButton
                durationSec={clip.durationSec}
                active={playingClipId === clip.id}
                onClick={() => onPlayClip(clip.id)}
              />
            );
          })()}

          {scoutMode ? (
            // A seek/jump promise, not a disclosure caret — there is no expand-in-place
            // state in Scout, so this is purely decorative (the whole row is the target).
            <span className="pbpv2__chevron" aria-hidden="true">▸</span>
          ) : (
            <button
              type="button"
              className="pbpv2__chevron"
              aria-label={isOpen ? "Collapse" : "Expand"}
              onClick={(e) => { e.stopPropagation(); if (hasPitches) toggle(atBat.atBatIndex); }}
            >
              {hasPitches ? (isOpen ? "▴" : "▾") : "—"}
            </button>
          )}
        </div>

        {!scoutMode && isOpen && hasPitches && (
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
      <div className={`pbpv2__header${flipped ? " pbpv2__header--scorecard" : scoutMode && scoutControls != null ? " pbpv2__header--scout" : ""}`}>
        {flipped ? (
          // Scorecard header (PROMPT_scorecard_header.md §2): a borderless 2×2 grid.
          // Col 1 = the SCOREBOOK lockup + inning window, only as wide as it needs.
          // Col 2, row 1 = one right-justified group: the shared transport (Scout
          // only) │ team · Full card · Back. Col 2, row 2 = the timeline, bounded
          // to col 2 (Scout only — live has no play head).
          <div className="pbpv2__sc-head">
            <div className="pbpv2__header-scorecard-left">
              <span className="pbpv2__title pbpv2__title--scorebook">
                {/* Brand lockup, not an affordance: IQDiamond in ink renders its
                    OTHER mark — a small rotated square, not the IQ glyph's home
                    plate, and never a tail (PROMPT_iq_global.md §3). Rust + a tail
                    means "Baseball IQ here" app-wide; this mark is never
                    interactive, so it must never be mistaken for that. */}
                <IQDiamond size={15} color="var(--color-ink)" />
                SCOREBOOK
              </span>
              {/* The innings in view; ‹ › glide one inning (PROMPT_scorecard_frozen.md §1). */}
              {inningWindow != null && (
                <span className="pbpv2__innings">
                  {!inningWindow.all && (
                    <button type="button" className="pbpv2__innings-chev" aria-label="Earlier innings"
                      disabled={!inningWindow.canPrev} onClick={() => stepInning(-1)}>
                      <svg width="8" height="12" viewBox="0 0 9 14" fill="none" aria-hidden="true"><polyline points="8,1 2,7 8,13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  )}
                  <span className="pbpv2__innings-label">
                    {inningWindow.all
                      ? `All ${inningWindow.innings} innings`
                      : `Innings ${inningWindow.first}–${inningWindow.last} of ${inningWindow.innings}`}
                  </span>
                  {!inningWindow.all && (
                    <button type="button" className="pbpv2__innings-chev" aria-label="Later innings"
                      disabled={!inningWindow.canNext} onClick={() => stepInning(1)}>
                      <svg width="8" height="12" viewBox="0 0 9 14" fill="none" aria-hidden="true"><polyline points="1,1 7,7 1,13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  )}
                </span>
              )}
            </div>
            <div className="pbpv2__sc-controls">
              {scoutMode && scoutControls != null && (
                <>
                  <ScoutTransport c={scoutControls} />
                  <span className="st__sep" />
                </>
              )}
              <div className="pbpv2__sc-own">
                {scorecardTeamToggle}
                <button
                  type="button"
                  className="st__btn pbpv2__fullcard-btn"
                  onClick={() => setFullCard(true)}
                  title="Show the whole scorecard"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M1.5 6V1.5H6M10 1.5h4.5V6M1.5 10v4.5H6M10 14.5h4.5V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Full card
                </button>
                <button
                  type="button"
                  className="st__btn"
                  onClick={() => setFlipped(false)}
                  title="Back to pitch by pitch"
                >
                  ← Back
                </button>
              </div>
            </div>
            {scoutMode && scoutControls != null && (
              <>
                <span />
                <div className="pbpv2__sc-timeline">
                  <ScoutTimeline
                    compact
                    total={scoutControls.totalMoments}
                    markerIdx={scoutControls.markerMoment}
                    onSeek={scoutControls.onSeekInning}
                    runMarkers={scoutControls.runMarkers}
                    halfInnings={scoutControls.halfInnings}
                    awayAbbr={awayAbbr}
                    homeAbbr={homeAbbr}
                  />
                </div>
              </>
            )}
          </div>
        ) : scoutMode && scoutControls != null ? (
          <>
            <div className="pbpv2__header-r1">
              <span className="pbpv2__title">{scoutControls.contextLabel ?? "Scout"}</span>
              <div className="scout-controls__right">
                <ScoutTransport c={scoutControls} />
                <span className="st__sep" />
                <button
                  type="button"
                  className="st__btn"
                  onClick={flipToScorecard}
                  title="Scorecard view"
                >
                  Scorecard
                </button>
              </div>
            </div>
            <ScoutTimeline
              total={scoutControls.totalMoments}
              markerIdx={scoutControls.markerMoment}
              onSeek={scoutControls.onSeekInning}
              runMarkers={scoutControls.runMarkers}
              halfInnings={scoutControls.halfInnings}
              awayAbbr={awayAbbr}
              homeAbbr={homeAbbr}
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
                className="pbpv2__flip-btn pbpv2__flip-btn--text"
                onClick={flipToScorecard}
                title="Scorecard view"
              >
                Scorecard
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
            {/* Due up, or up next before his first pitch: neutral, not rust. */}
            <div className={`pbpv2__canvas${dueUpNext != null || currentAtBat?.upNext === true ? " pbpv2__canvas--due-up" : ""}`}>
              {dueUpNext != null && dueUpNext.batters[0] != null ? (
                <>
                  <div className="pbpv2__canvas-batter">
                    <div className="pbpv2__pa-header" style={{ cursor: "default" }}>
                      <div className="pbpv2__pa-meta">
                        <span className="pbpv2__pa-inning">
                          {halfLabel(dueUpNext.incomingHalf, dueUpNext.incomingInning)}
                        </span>
                        <TeamMark
                          logoUrl={dueUpNext.incomingHalf === "top" ? awayLogoUrl : homeLogoUrl}
                          abbr={dueUpNext.incomingHalf === "top" ? awayAbbr : homeAbbr}
                          size={22}
                        />
                      </div>
                      <span />
                      <div className="pbpv2__pa-text">
                        {dueUpNext.batters[0].battingOrderSlot > 0 && <OrderSpot n={dueUpNext.batters[0].battingOrderSlot} />}
                        <Link to={`/player/${dueUpNext.batters[0].batterId}`} state={{ fromGame: game?.providerGameId }} className="pbpv2__batter-name player-link">{dueUpNext.batters[0].batterName}</Link>
                        {" "}
                        <span className="pbpv2__pa-summary">· leading off · 0-0</span>
                        <Pill tone="soft">DUE UP</Pill>
                      </div>
                      <span />
                    </div>
                  </div>
                  <div className="pbpv2__canvas-pitches">
                    <div className="pbpv2__empty">
                      Waiting for the first pitch of the {dueUpNext.incomingHalf === "top" ? "top" : "bottom"} of the {ordinal(dueUpNext.incomingInning)}.
                    </div>
                  </div>
                </>
              ) : currentAtBat != null ? (
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
                      {/* Live at-bat: the empty rust-dashed scorebook cell — the same cell the batter card shows for the current PA (PROMPT_live_ab_badge.md). Width matches this list's finished badges (40) so the column stays aligned. */}
                      {/* Up next (before his first pitch): the cell is neutral, not rust. */}
                      <ScorebookCell live active={currentAtBat.upNext !== true} codeIn width={40} />
                      <div className="pbpv2__pa-text">
                        {renderOrderSpot(orderByBatter, currentAtBat.batterId)}
                        <Link to={`/player/${currentAtBat.batterId}`} state={{ fromGame: game?.providerGameId }} className="pbpv2__batter-name player-link">{currentAtBat.batterName}</Link>
                        {" "}
                        {currentAtBat.upNext === true ? (
                          <>
                            <span className="pbpv2__pa-summary">· up next · 0-0</span>
                            <Pill tone="soft">UP NEXT</Pill>
                          </>
                        ) : (
                          <>
                            <span className="pbpv2__pa-summary">· At bat</span>
                            <LivePill label="LIVE" />
                          </>
                        )}
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
                <ScorebookCell live active codeIn width={40} />
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
                          const { base: runnerFinal, isOut: runnerOut } = lastRunnerStop(runnerFinalBaseByAtBat?.get(atBat.atBatIndex));
                          const cellProps = playResultToCellProps(atBat.result, atBat.scorebookCode);
                          const scored = atBat.result === 'HomeRun'
                            || scoredByAtBatIndex.has(atBat.atBatIndex)
                            || (!runnerOut && runnerFinal != null && runnerFinal >= 4);
                          return (
                            <ScorebookCell
                              codeIn
                              {...cellProps}
                              finalBase={runnerOut ? undefined : (runnerFinal ?? cellProps.finalBase)}
                              outAt={runnerOut ? runnerFinal : undefined}
                              scored={scored}
                              width={40}
                            />
                          );
                        })()
                    }
                    <div className="pbpv2__pa-text">
                      {renderOrderSpot(orderByBatter, atBat.batterId)}
                      <Link to={`/player/${atBat.batterId}`} state={{ fromGame: game?.providerGameId }} className="pbpv2__batter-name player-link">{atBat.batterName}</Link>
                      {!isFuture && atBat.result != null && (
                        <>
                          {" "}
                          <span className="pbpv2__pa-summary">
                            · {playResultToLabel(atBat.result, atBat.scorebookCode)}
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
          onClick={onScorecardClick}
        >
          <div className="pbpv2__scorecard-content">
            <div style={{ opacity: scorecardFading ? 0 : 1, transition: 'opacity 150ms ease' }}>
            {/* Game meta now lives INSIDE the sheet as its own matchup row (rev 3,
                Sep 23) — the frame's SCOREBOOK lockup carries the brand, so the
                sheet no longer needs a separate meta strip above it. */}
            {renderScorecardSheet()}
            </div>
          </div>
        </div>
        {!fullCard && tracePanel}
      </div>
      {!fullCard && clipPlayer}
      {fullCard && (
        <ScorecardFullCard
          placeholder={fullCardPlaceholder}
          onClosed={closeFullCard}
          side={scorecardEffSide}
          inningsFor={scorecardInningsFor}
          controls={scorecardTeamToggle}
          renderSheet={(s, cellScale) => (
            <div style={{ opacity: scorecardFading ? 0 : 1, transition: 'opacity 150ms ease' }}>
              {renderScorecardSheet(cellScale, false, s)}
            </div>
          )}
          renderPrintSheet={(s) => renderScorecardSheet(1, false, s, true)}
          overlay={<>{tracePanel}{clipPlayer}</>}
          onSheetClick={onScorecardClick}
        />
      )}
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
                {/* An ABS challenge of this call: did it stand or get reversed. */}
                {p.challenge != null && (
                  <span className={`pbpv2__challenge pbpv2__challenge--${p.challenge}`}>
                    Challenge - {p.challenge}
                  </span>
                )}
              </Td>
              <Td dim>{p.count}</Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
