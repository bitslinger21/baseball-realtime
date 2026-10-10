import "./GamePage.css";
import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";

import type { BoxScoreDto, GameViewDto, PitcherLineDto } from "@bitslinger21/scorebook-client";
import { gamesApi, boxScoreApi } from "../api/baseballApiClient";
import { useRealtimeGame } from "../realtime/useRealtimeGame";
import type { PlayUpdate } from "../realtime/types";
import { useRealtimeDailyGames } from "../realtime/useRealtimeDailyGames";
import { useAtBatHistory } from "../hooks/useAtBatHistory";
import { useBatterInfo } from "../hooks/useBatterInfo";
import type { ScoringInfo } from "./game/PitchByPitchV2";

import { BrandHeader } from "../components/primitives/BrandHeader";
import type { ConversationTurn, IqAnswer } from "../components/primitives/BaseballIQButton";
import { getReturnLabel } from "../utils/backLabel";
import { TEAM_NICKNAMES } from "../utils/teamNicknames";
import { PageTitle } from "../components/primitives/PageTitle";
import { LivePill, Pill } from "../components/primitives/Pill";
import { Segmented } from "../components/primitives/Segmented";

import { LineScoreBand } from "./game/LineScoreBand";
import { MatchupLeft } from "./game/MatchupLeft";
import { MatchupContext } from "./game/MatchupContext";
import { PitchByPitchV2 } from "./game/PitchByPitchV2";
import { GameHighlightsRow } from "./game/GameHighlightsRow";
import { useGameClipIndex, useLazyGameClips } from "../hooks/useGameClips";
import { scoutPositionStore } from "./game/scoutPositionStore";
import { WinProbTimeline, type WinProbPoint } from "./game/WinProbTimeline";
import { LeverageCard } from "./game/LeverageCard";
import { LineupsTray } from "./game/LineupsTray";
import { PregameView, formatFirstPitchParts } from "./game/PregameView";
import { HeadToHeadScreen } from "./game/HeadToHeadScreen";
import { isHalfInningTransition, deriveDueUpNext, deriveHalfJustEnded } from "./game/halfInningTransition";

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

// Head-aware pitching CHAIN for one side, for Scout mode's Head-to-head
// screen — boxScore.<side>.pitching always reflects the FULL/final game, so
// scrubbing back to the 8th with two pitching changes still ahead would
// otherwise show the game's last pitcher, not whoever was actually on the
// mound at the scrubbed position. Same event-scanning approach as
// scoutPitcherLine below, generalized to every pitcher who has appeared
// (by name — PlayUpdate carries no stable pitcher id), in order, each with
// their own stint's IP/R/H/K/BB. Identity (playerId/jerseyNumber/handedness)
// is looked up from the boxscore by name, since that doesn't change with
// the scrub position — only the accumulated stats do.
function deriveScoutPitchingChain(
  updates: readonly PlayUpdate[],
  half: 'top' | 'bottom',
  sideBox: { pitching: readonly PitcherLineDto[] } | null | undefined,
): PitcherLineDto[] {
  const HIT_SET = new Set(['Single', 'Double', 'Triple', 'HomeRun']);
  const OUT_RESULTS = new Set(['Strikeout', 'Groundout', 'Flyout', 'Lineout', 'PopOut', 'Out', 'SacFly', 'SacBunt', 'CaughtStealing', 'Pickoff']);
  const WALK_RESULTS = new Set(['Walk', 'IntentionalWalk']);

  const order: string[] = [];
  const seen = new Set<string>();
  for (const u of updates) {
    if (u.half === half && u.pitcherName != null && !seen.has(u.pitcherName)) {
      seen.add(u.pitcherName);
      order.push(u.pitcherName);
    }
  }
  if (order.length === 0) return [];

  const stats = new Map<string, { outs: number; r: number; h: number; so: number; bb: number }>();
  for (const name of order) stats.set(name, { outs: 0, r: 0, h: 0, so: 0, bb: 0 });

  const seenABs = new Set<number>();
  let prevAway = updates[0]?.awayScore ?? 0;
  let prevHome = updates[0]?.homeScore ?? 0;
  for (const u of updates) {
    if (u.half === half && u.pitcherName != null) {
      const s = stats.get(u.pitcherName)!;
      s.r += half === 'top'
        ? Math.max(0, u.awayScore - prevAway)
        : Math.max(0, u.homeScore - prevHome);
      if (u.playResult != null && u.atBatIndex != null && !seenABs.has(u.atBatIndex)) {
        seenABs.add(u.atBatIndex);
        if (HIT_SET.has(u.playResult)) s.h++;
        if (u.playResult === 'Strikeout') s.so++;
        if (WALK_RESULTS.has(u.playResult)) s.bb++;
        const outs = u.playResult === 'DoublePlay' ? 2 : u.playResult === 'TriplePlay' ? 3 : OUT_RESULTS.has(u.playResult) ? 1 : 0;
        s.outs += outs;
      }
    }
    prevAway = u.awayScore;
    prevHome = u.homeScore;
  }

  return order.map((name): PitcherLineDto => {
    const s = stats.get(name)!;
    const whole = Math.floor(s.outs / 3);
    const thirds = s.outs % 3;
    const identity = sideBox?.pitching.find((p) => p.name === name);
    return {
      playerId: identity?.playerId ?? 0,
      name,
      jerseyNumber: identity?.jerseyNumber ?? null,
      position: identity?.position ?? 'P',
      ip: thirds === 0 ? `${whole}` : `${whole}.${thirds}`,
      h: s.h,
      r: s.r,
      er: s.r,
      bb: s.bb,
      so: s.so,
      handedness: identity?.handedness,
    };
  });
}

export function GamePage(): ReactElement {
  const { providerGameId } = useParams();
  const gameId: string | null = providerGameId ?? null;
  const navigate = useNavigate();
  const location = useLocation();
  // Status hint passed by the landing page at navigation time — lets us show the
  // correct pill immediately, before the REST fetch or socket update resolves.
  const locState = location.state as { gameStatus?: string; from?: string; fromLabel?: string } | null;
  const navStatusHint = locState?.gameStatus ?? null;
  const returnLabel = getReturnLabel(locState?.from, locState?.fromLabel);

  const [game, setGame] = useState<GameViewDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [boxScore, setBoxScore] = useState<BoxScoreDto | null>(null);
  const [lineupsOpen, setLineupsOpen] = useState(false);
  const [lineupsClosing, setLineupsClosing] = useState(false);
  const [elapsedLabel, setElapsedLabel] = useState<string | null>(null);
  const [countdownLabel, setCountdownLabel] = useState<string | null>(null);
  const [view, setView] = useState<"main" | "h2h">("main");
  const [scorecardOpen, setScorecardOpen] = useState(false);
  const [scorecardFading, setScorecardFading] = useState(false);
  const scorecardFadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScorecardFlip = useCallback((open: boolean): void => {
    if (scorecardFadeTimer.current != null) clearTimeout(scorecardFadeTimer.current);
    if (open) {
      setScorecardFading(true);
      scorecardFadeTimer.current = setTimeout(() => {
        setScorecardFading(false);
        setScorecardOpen(true);
      }, 150);
    } else {
      setScorecardFading(false);
      setScorecardOpen(false);
    }
  }, []);

  const closeLineups = useCallback((): void => {
    setLineupsClosing(true);
    window.setTimeout((): void => {
      setLineupsOpen(false);
      setLineupsClosing(false);
    }, 230);
  }, []);

  const toggleLineups = useCallback((): void => {
    if (lineupsOpen) closeLineups();
    else setLineupsOpen(true);
  }, [lineupsOpen, closeLineups]);

  const {
    plays: updates,
    isConnected,
    connectionError,
    watchedGameIds,
    isActive,
    toggleGame,
  } = useRealtimeGame(gameId);

  const toggleGameRef = useRef<(id: string) => void>(toggleGame);
  const isActiveRef = useRef<(id: string) => boolean>(isActive);
  const startedWatchingHereRef = useRef<boolean>(false);

  useEffect(() => {
    toggleGameRef.current = toggleGame;
    isActiveRef.current = isActive;
  }, [toggleGame, isActive]);

  // Subscribe / unsubscribe to the realtime game feed
  useEffect(() => {
    if (gameId == null) return;
    const alreadyActive = isActiveRef.current(gameId);
    if (!alreadyActive) {
      toggleGameRef.current(gameId);
      startedWatchingHereRef.current = true;
    } else {
      startedWatchingHereRef.current = false;
    }
    return () => {
      if (startedWatchingHereRef.current && gameId != null) {
        if (isActiveRef.current(gameId)) toggleGameRef.current(gameId);
      }
      startedWatchingHereRef.current = false;
    };
  }, [gameId]);

  // Fetch game metadata
  useEffect((): void => {
    const load = async (): Promise<void> => {
      if (gameId == null) { setError("No game id provided in URL."); return; }
      try {
        setIsLoading(true);
        setError(null);
        const response = await gamesApi.gamesFindByProviderId(gameId);
        setGame(response.data ?? null);
      } catch (e) {
        console.error(e);
        setError("Failed to load game details.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [gameId]);

  // Fetch boxscore (polls every 60s for pitcher + batter lines)
  useEffect((): (() => void) => {
    if (gameId == null) return () => undefined;
    let cancelled = false;
    const fetch = async (): Promise<void> => {
      try {
        const resp = await boxScoreApi.boxScoreGet(gameId);
        if (!cancelled) setBoxScore(resp.data ?? null);
      } catch {
        // boxscore is supplemental — fail silently
      }
    };
    void fetch();
    const interval = window.setInterval(() => { void fetch(); }, 60_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [gameId]);

  const stableUpdates: readonly PlayUpdate[] = useMemo(() => updates, [updates]);

  // First moment index for each half-inning — drives the inning-jump select.
  const inningOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { label: string; headIdx: number; key: string }[] = [];
    for (let i = 0; i < stableUpdates.length; i++) {
      const u = stableUpdates[i];
      const key = `${u.half}-${u.inning}`;
      if (!seen.has(key)) {
        seen.add(key);
        opts.push({ label: `${u.half === "top" ? "▲" : "▼"}${u.inning}`, headIdx: i + 1, key });
      }
    }
    return opts;
  }, [stableUpdates]);

  // Live→final: flip once when the socket signals the game ended mid-session.
  const liveEndedFinalRef = useRef(false);
  const [liveEndedFinal, setLiveEndedFinal] = useState(false);

  // Daily feed — subscribed here (before isFinalGame) so its phase can feed into isFinalGame.
  const dateKey = useMemo(
    () => (typeof (game as any)?.gameDate === "string" ? String((game as any).gameDate).slice(0, 10) : null),
    [(game as any)?.gameDate],
  );
  const gameOverrides = useRealtimeDailyGames(dateKey);

  // updatesIndicateFinal: last hydrated play says the game is over — catches cases where
  // the game.status REST response lags behind (returns "live" for a recently-ended game).
  const updatesIndicateFinal = stableUpdates.length > 0 &&
    stableUpdates[stableUpdates.length - 1]?.status === 'final';

  // dailyIndicatesFinal: the daily realtime feed reports this game as FINAL — the most
  // reliable real-time signal, independent of the REST fetch or play status fields.
  const dailyIndicatesFinal = gameId != null && gameOverrides.get(gameId)?.phase === 'FINAL';

  const isFinalGame = game?.status === "final" || liveEndedFinal || updatesIndicateFinal || dailyIndicatesFinal || navStatusHint === 'final';

  // Final inning: last play's inning (stableUpdates is the authoritative source; fall back to
  // currentInning from the REST snapshot, which is now populated from the schedule API).
  const finalInning: number | null = isFinalGame
    ? (stableUpdates.length > 0
        ? (stableUpdates[stableUpdates.length - 1]?.inning ?? null)
        : (typeof (game?.currentInning as unknown) === 'number'
            ? (game!.currentInning as unknown as number)
            : typeof (game?.inning as unknown) === 'number'
              ? (game!.inning as unknown as number)
              : null))
    : null;

  // Scout mode: one play head for final games. head=1 = first pitch of game.
  // On remount (in-app return to same game), restore the saved head from the store.
  // position 0 = no pitches shown yet; restored position from store on re-visit
  const [scoutMarkerIdx, setScoutMarkerIdx] = useState(() =>
    providerGameId != null ? (scoutPositionStore.get(providerGameId)?.headIdx ?? 0) : 0
  );
  const [scoutPlaying, setScoutPlaying] = useState(false);
  const [scoutSpeed, setScoutSpeed] = useState(1);

  // Refs for safe access to current values in cleanup callbacks.
  const scoutMarkerIdxRef = useRef(scoutMarkerIdx);
  useEffect(() => { scoutMarkerIdxRef.current = scoutMarkerIdx; }, [scoutMarkerIdx]);
  const stableUpdatesRef = useRef(stableUpdates);
  useEffect(() => { stableUpdatesRef.current = stableUpdates; }, [stableUpdates]);
  const isFinalGameRef = useRef(false);
  useEffect(() => { isFinalGameRef.current = isFinalGame; }, [isFinalGame]);

  // Track whether we've seen any live updates — distinguishes a live→final transition
  // from a game that was already final when the page loaded.
  const hasSeenLiveRef = useRef(false);

  // Detect live→final transition from socket feed. Fires at most once per game session:
  // sets liveEndedFinal=true, parks the scout head at the last play (paused in Scout).
  // Does NOT fire for already-final games on cold load — those open at head=1 (game start).
  useEffect(() => {
    if (liveEndedFinalRef.current) return;
    const last = stableUpdates[stableUpdates.length - 1];
    if (last?.status === 'live') hasSeenLiveRef.current = true;
    if (last?.status === 'final' && hasSeenLiveRef.current) {
      liveEndedFinalRef.current = true;
      setLiveEndedFinal(true);
      setScoutMarkerIdx(stableUpdates.length);
      setScoutPlaying(false);
    }
  }, [stableUpdates]);

  // Handle game navigation while mounted (e.g. browsing /game/A → /game/B).
  // On first mount prevGameIdRef is null, so nothing resets — the useState
  // initializer already seeded from the store. On a same-session game change,
  // clear the old record and reset the head.
  const prevGameIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (gameId == null) return;
    if (prevGameIdRef.current !== null && prevGameIdRef.current !== gameId) {
      scoutPositionStore.clear(prevGameIdRef.current);
      setScoutMarkerIdx(0);
      setScoutPlaying(false);
    }
    prevGameIdRef.current = gameId;
  }, [gameId]);

  // Save head on unmount so an in-app return restores the exact position.
  // Stores both headIdx (for immediate restore on remount) and atBatId (stable id per spec).
  // Never saves for live games (PR-11 handles those separately).
  useEffect(() => {
    return () => {
      if (gameId != null && isFinalGameRef.current) {
        scoutPositionStore.save(gameId, {
          headIdx: scoutMarkerIdxRef.current,
          atBatId: stableUpdatesRef.current[scoutMarkerIdxRef.current - 1]?.atBatIndex ?? null,
        });
      }
    };
  }, [gameId]);

  // Auto-advance in Scout/Replay mode: one PITCH per tick so each delivery is revealed individually.
  useEffect(() => {
    if (!isFinalGame || !scoutPlaying) return;
    if (scoutMarkerIdx >= stableUpdates.length) { setScoutPlaying(false); return; }
    const id = window.setTimeout(() => {
      setScoutMarkerIdx((i) => Math.min(i + 1, stableUpdatesRef.current.length));
    }, Math.round(750 / scoutSpeed));
    return () => window.clearTimeout(id);
  }, [isFinalGame, scoutPlaying, scoutMarkerIdx, stableUpdates.length, scoutSpeed]);

  const replayUpdates: readonly PlayUpdate[] = isFinalGame
    ? stableUpdates.slice(0, scoutMarkerIdx)
    : stableUpdates;

  // Scoring info per at-bat — runs scored + resulting score, keyed by atBatIndex.
  // Sequential delta-tracking handles two edge cases: (1) updates with null atBatIndex
  // are skipped by grouping but still carry score data; (2) score-lag where MLB API
  // delivers the updated score on the first pitch of the next at-bat.
  const scoringByAtBat = useMemo((): ReadonlyMap<number, ScoringInfo> => {
    if (game == null || replayUpdates.length === 0) return new Map();
    const result = new Map<number, ScoringInfo>();
    let prevAway = replayUpdates[0].awayScore;
    let prevHome = replayUpdates[0].homeScore;

    // FIFO queue of atBatIndexes for plays confirmed as scoring events (by description
    // keywords). When back-to-back HRs arrive before MLB sends the score update, a simple
    // lastResultIdx gets overwritten by the second HR before the first run is credited.
    // The queue preserves order: pop the front entry on each score delta so Walker's run
    // lands on Walker's row and Paredes' run lands on Paredes' row.
    const scoringQueue: number[] = [];
    const enqueued = new Set<number>();

    function tryEnqueue(idx: number | null | undefined, description: string | null | undefined, playResult?: string | null): void {
      if (idx == null || enqueued.has(idx)) return;
      const d = String(description ?? '').toLowerCase();
      // "homer" catches both "homer" and "homers" as a substring match.
      const isScoringDesc = d.includes('scores') || d.includes('homer') || d.includes('home run') || d.includes('run(s)');
      // HR always scores regardless of whether the description has arrived yet.
      if (isScoringDesc || playResult === 'HomeRun') {
        scoringQueue.push(idx);
        enqueued.add(idx);
      }
    }

    // Last non-null atBatIndex seen — inherited by updates that arrive without one
    // (MLB's feed sometimes omits atBatIndex on score or description updates for the
    // same at-bat, which would cause tryEnqueue to bail at the idx==null guard).
    let lastKnownIdx: number | null = replayUpdates[0].atBatIndex ?? null;
    tryEnqueue(lastKnownIdx, replayUpdates[0].description, replayUpdates[0].playResult);

    for (let i = 1; i < replayUpdates.length; i++) {
      const u = replayUpdates[i];
      const runs = (u.awayScore - prevAway) + (u.homeScore - prevHome);
      const curIdx = u.atBatIndex ?? null;
      if (curIdx != null) lastKnownIdx = curIdx;
      const effectiveIdx = curIdx ?? lastKnownIdx;

      // Enqueue BEFORE attributing runs: when description and score arrive in the same
      // update, the AB is at the front of the queue before we pop it.
      tryEnqueue(effectiveIdx, u.description, u.playResult);

      if (runs > 0) {
        // Pop one entry per run so back-to-back HRs whose score arrives as a single
        // +2 delta each get their own chip instead of both runs landing on the first entry.
        // If the queue empties before runs are exhausted (e.g. grand slam: 4 runs, 1 entry),
        // the remainder stacks on the last-popped entry. If the queue is empty from the
        // start, fall back to effectiveIdx (wild pitch, scoreless update, etc.).
        let remaining = runs;
        let lastTarget: number | null = null;
        while (remaining > 0 && scoringQueue.length > 0) {
          const t = scoringQueue.shift()!;
          const ex = result.get(t);
          result.set(t, {
            runs: (ex?.runs ?? 0) + 1,
            awayScore: u.awayScore,
            homeScore: u.homeScore,
            awayAbbr: game.awayAbbr,
            homeAbbr: game.homeAbbr,
          });
          lastTarget = t;
          remaining--;
        }
        if (remaining > 0) {
          const t = lastTarget ?? effectiveIdx;
          if (t != null) {
            const ex = result.get(t);
            result.set(t, {
              runs: (ex?.runs ?? 0) + remaining,
              awayScore: u.awayScore,
              homeScore: u.homeScore,
              awayAbbr: game.awayAbbr,
              homeAbbr: game.homeAbbr,
            });
            // Fallback path: mark as handled so the HR pitch arriving later
            // (with "In play, run(s)" / playResult='HomeRun') doesn't re-enqueue
            // this AB and double-count its run on a subsequent pop.
            if (lastTarget == null) enqueued.add(t);
          }
        }
      }

      prevAway = u.awayScore;
      prevHome = u.homeScore;
    }

    return result;
  }, [replayUpdates, game]);

  // Runner advancement: each runner's base stops BEYOND their own PA result,
  // keyed by the atBatIndex of the cell they run on. Each entry:
  // { base: 1-4 (4 = scored), advancedByAtBatIndex: the at-bat whose event
  // moved them, isOut? }.
  //
  // Drawn straight from MLB's own runner movements (play.runners[], sent on
  // each frame as `runners` — PROMPT_bug_fixes_oct9.md A5/C), not inferred
  // from playResult + bases. A movement rides on the pitch it followed, so a
  // steal or wild pitch appears on that pitch — not when the at-bat ends —
  // credited to the at-bat it happened in, even one that ends in an out.
  const runnerFinalBaseByAtBat = useMemo((): ReadonlyMap<number, ReadonlyArray<{ base: number; advancedByAtBatIndex?: number; isOut?: boolean }>> => {
    const result = new Map<number, Array<{ base: number; advancedByAtBatIndex?: number; isOut?: boolean }>>();
    if (replayUpdates.length === 0) return result;

    const BASE_NUM: Record<string, number> = { "1B": 1, "2B": 2, "3B": 3, "4B": 4, score: 4 };
    const BASE_NAMES = ["", "1B", "2B", "3B", "HOME"];
    // The base a batter's own result puts him on; reaching further than this
    // on his own play (taking second on the throw, a dropped third strike,
    // a forceout) is drawn as a stop of his own.
    const impliedBase = (pr: string | undefined): number => {
      if (pr === "HomeRun") return 4;
      if (pr === "Triple") return 3;
      if (pr === "Double") return 2;
      return pr === "Single" || pr === "Walk" || pr === "IntentionalWalk" || pr === "HitByPitch" || pr === "HBP" ||
        pr === "Error" || pr === "FieldersChoice" || pr === "CatcherInterference" ? 1 : 0;
    };
    const nameByIdx = new Map<number, string>();
    for (const u of replayUpdates) if (u.atBatIndex != null && u.batterName != null) nameByIdx.set(u.atBatIndex, u.batterName);
    const abLabel = (idx: number): string => {
      const name = nameByIdx.get(idx);
      return name != null ? `AB#${idx}(${name})` : `AB#${idx}`;
    };

    const entriesFor = (cell: number): Array<{ base: number; advancedByAtBatIndex?: number; isOut?: boolean }> => {
      let entries = result.get(cell);
      if (entries == null) { entries = []; result.set(cell, entries); }
      return entries;
    };
    const recordAdvance = (cell: number, base: number, advancedBy: number): void => {
      const entries = entriesFor(cell);
      const last = entries[entries.length - 1];
      if (last?.isOut === true || base <= (last?.base ?? 0)) return;
      entries.push({ base, advancedByAtBatIndex: advancedBy });
      console.log(`[scorecard] ${abLabel(cell)} → ${BASE_NAMES[base] ?? base} (driven by ${abLabel(advancedBy)})`);
    };
    // An out can come at the base the runner already holds (a pickoff).
    const recordOut = (cell: number, base: number, outBy: number): void => {
      const entries = entriesFor(cell);
      const last = entries[entries.length - 1];
      if (last?.isOut === true || base < (last?.base ?? 0)) return;
      entries.push({ base, advancedByAtBatIndex: outBy, isOut: true });
      console.log(`[scorecard] ${abLabel(cell)} OUT at ${BASE_NAMES[base] ?? base} (by ${abLabel(outBy)})`);
    };

    const cellOfRunner = new Map<number, number>(); // runner id → the cell he runs on
    const cellOnBase = new Map<string, number>(); // "1B" | "2B" | "3B" → that runner's cell
    const seen = new Set<string>();
    let halfKey: string | null = null;

    for (const u of replayUpdates) {
      const hk = `${u.inning}-${u.half}`;
      if (hk !== halfKey) { halfKey = hk; cellOnBase.clear(); }
      const idx = u.atBatIndex;
      if (idx == null) continue;
      const batterId = u.batterId != null ? Number(u.batterId) : null;

      for (const m of u.runners ?? []) {
        const key = `${idx}|${m.runnerId}|${m.playIndex}|${m.start}|${m.end}|${m.isOut}`;
        if (seen.has(key)) continue;
        seen.add(key);

        if (m.start == null && m.runnerId === batterId) {
          // The batter leaving home on his own play.
          if (m.isOut || m.end == null) continue;
          cellOfRunner.set(m.runnerId, idx);
          const base = BASE_NUM[m.end] ?? 0;
          if (base > impliedBase(u.playResult)) recordAdvance(idx, base, idx);
          if (m.end !== "score") cellOnBase.set(m.end, idx);
          continue;
        }

        // A runner already on base — or a pinch runner, who takes over the
        // cell of the base he started from.
        const cell = cellOfRunner.get(m.runnerId) ?? (m.start != null ? cellOnBase.get(m.start) : undefined);
        if (cell == null) continue;
        cellOfRunner.set(m.runnerId, cell);
        if (m.start != null && cellOnBase.get(m.start) === cell) cellOnBase.delete(m.start);
        if (m.isOut) {
          const outBase = BASE_NUM[m.outBase ?? ""] ?? 0;
          if (outBase > 0) recordOut(cell, outBase, idx);
        } else if (m.end != null) {
          recordAdvance(cell, BASE_NUM[m.end] ?? 0, idx);
          if (m.end !== "score") cellOnBase.set(m.end, cell);
        }
      }
    }
    return result;
  }, [replayUpdates]);

  const { currentAtBat, completedAtBats } = useAtBatHistory(replayUpdates);

  // Full-game AB list — used by Scout mode to show future ABs in the feed.
  // The last AB of a completed game stays as currentAtBat in the hook (no "next AB"
  // to push it into completedAtBats), so we append it if present.
  const { completedAtBats: allCompleted, currentAtBat: allCurrent } = useAtBatHistory(stableUpdates);
  const allCompletedAtBats = useMemo(
    () => (allCurrent != null ? [...allCompleted, allCurrent] : allCompleted),
    [allCompleted, allCurrent],
  );

  // atBatIndex at the current head — drives past/current/future boundary in Scout mode.
  const markerAtBatIndex: number | null = isFinalGame && scoutMarkerIdx > 0
    ? (stableUpdates[scoutMarkerIdx - 1]?.atBatIndex ?? null)
    : null;

  // Seek the head to the last pitch of the given atBatIndex, then pause.
  const seekToAb = useCallback((targetAtBatIndex: number): void => {
    let lastIdx = 1;
    for (let i = 0; i < stableUpdates.length; i++) {
      if (stableUpdates[i].atBatIndex === targetAtBatIndex) lastIdx = i + 1;
    }
    setScoutMarkerIdx(lastIdx);
    setScoutPlaying(false);
  }, [stableUpdates]);

  // Step forward or backward one at-bat, landing ON its first pitch.
  const stepAb = useCallback((dir: -1 | 1): void => {
    if (markerAtBatIndex == null || allCompletedAtBats.length === 0) return;
    const curPos = allCompletedAtBats.findIndex((ab) => ab.atBatIndex === markerAtBatIndex);
    if (curPos === -1) return;
    const nextPos = curPos + dir;
    if (nextPos < 0 || nextPos >= allCompletedAtBats.length) return;
    const targetAtBatIndex = allCompletedAtBats[nextPos].atBatIndex;
    // scoutMarkerIdx counts pitches revealed, and `latest` is the last revealed one
    // (stableUpdates[scoutMarkerIdx - 1]) — so to land ON the target AB's first pitch,
    // that pitch must be INCLUDED in the reveal, i.e. scoutMarkerIdx = i + 1. Excluding
    // it (scoutMarkerIdx = i) doesn't produce an empty "before this AB" state, it just
    // leaves `latest` on the previous AB's last pitch — the screen never advances.
    let targetMarkerIdx = 1;
    for (let i = 0; i < stableUpdates.length; i++) {
      if (stableUpdates[i].atBatIndex === targetAtBatIndex) {
        targetMarkerIdx = i + 1;
        break;
      }
    }
    setScoutMarkerIdx(targetMarkerIdx);
    setScoutPlaying(false);
  }, [markerAtBatIndex, allCompletedAtBats, stableUpdates]);

  // Step forward or backward one pitch.
  const stepPitch = useCallback((dir: -1 | 1): void => {
    setScoutMarkerIdx((prev) => Math.max(1, Math.min(stableUpdates.length, prev + dir)));
    setScoutPlaying(false);
  }, [stableUpdates.length]);

  // Toggle play/pause. Restarting from the beginning if at the end.
  const togglePlay = useCallback((): void => {
    if (!scoutPlaying && scoutMarkerIdx >= stableUpdates.length) setScoutMarkerIdx(0);
    setScoutPlaying((p) => !p);
  }, [scoutPlaying, scoutMarkerIdx, stableUpdates.length]);

  // Win probability timeline — one point per at-bat, deduped by atBatIndex.
  // Includes inning so WinProbTimeline can place tick marks at real inning starts.
  const winProbPts = useMemo((): WinProbPoint[] => {
    const byAtBat = new Map<number, { pct: number; inning: number }>();
    for (const u of replayUpdates) {
      if (u.atBatIndex != null && u.homeTeamWinProbability != null) {
        // Always overwrite so we keep the last pitch's values for each at-bat
        byAtBat.set(u.atBatIndex, { pct: u.homeTeamWinProbability, inning: u.inning });
      }
    }
    if (byAtBat.size === 0) return [];
    const sorted = Array.from(byAtBat.entries()).sort((a, b) => a[0] - b[0]);
    const total = sorted[sorted.length - 1][0];
    const pts = sorted.map(([idx, { pct, inning }]) => ({
      t: total > 0 ? idx / total : 0,
      pct,
      inning,
    }));
    // Force the final point to 100/0 only when the play head is at the very end of
    // a completed game — not mid-scrub, where the last visible point is legitimate.
    if (isFinalGame && pts.length > 0 && replayUpdates.length === stableUpdates.length) {
      const last = replayUpdates[replayUpdates.length - 1];
      if (last.homeScore != null && last.awayScore != null) {
        pts[pts.length - 1].pct = last.homeScore > last.awayScore ? 100 : 0;
      }
    }
    return pts;
  }, [replayUpdates, isFinalGame, stableUpdates.length]);

  const currentLeverage: number | null = useMemo(() => {
    for (let i = replayUpdates.length - 1; i >= 0; i--) {
      const li = replayUpdates[i].leverageIndex;
      if (li != null) return li;
    }
    return null;
  }, [replayUpdates]);

  const peakLeverage: number = useMemo(
    () => replayUpdates.reduce((max, u) => (u.leverageIndex != null && u.leverageIndex > max ? u.leverageIndex : max), 0),
    [replayUpdates],
  );

  // Run markers for the scout timeline: one per scoring play, keyed by pitch index.
  const scoutRunMarkers = useMemo((): { idx: number; team: "away" | "home"; count: number }[] => {
    if (!isFinalGame || stableUpdates.length === 0) return [];
    const result: { idx: number; team: "away" | "home"; count: number }[] = [];
    for (let i = 1; i < stableUpdates.length; i++) {
      const prev = stableUpdates[i - 1];
      const curr = stableUpdates[i];
      const awayDelta = (curr.awayScore ?? 0) - (prev.awayScore ?? 0);
      const homeDelta = (curr.homeScore ?? 0) - (prev.homeScore ?? 0);
      if (awayDelta > 0) result.push({ idx: i, team: "away", count: awayDelta });
      if (homeDelta > 0) result.push({ idx: i, team: "home", count: homeDelta });
    }
    return result;
  }, [isFinalGame, stableUpdates]);

  // Half-inning boundaries: every time the half (top/bottom) or inning changes.
  // Drives the alternating rail colors and inning tick marks on ScoutTimeline.
  const scoutHalfInnings = useMemo((): { idx: number; half: "top" | "bottom"; inning: number }[] => {
    if (!isFinalGame || stableUpdates.length === 0) return [];
    const result: { idx: number; half: "top" | "bottom"; inning: number }[] = [];
    let prevKey = "";
    for (let i = 0; i < stableUpdates.length; i++) {
      const u = stableUpdates[i];
      const key = `${u.half}-${u.inning}`;
      if (key !== prevKey) {
        prevKey = key;
        result.push({ idx: i, half: u.half as "top" | "bottom", inning: u.inning });
      }
    }
    return result;
  }, [isFinalGame, stableUpdates]);

  // Batting-order slot by playerId (1–9), built from boxScore lineup data.
  // Used by MatchupLeft, PitchByPitchV2, and MatchupContext to show OrderSpot chips.
  // battingOrder is encoded as slot*100 + subDepth (e.g. "300" = slot 3, starter).
  const orderByBatter = useMemo((): ReadonlyMap<number, number> => {
    if (boxScore == null) return new Map();
    const map = new Map<number, number>();
    const addSide = (batting: readonly { playerId: number; battingOrder?: string | null }[]): void => {
      for (const b of batting) {
        if (b.battingOrder == null) continue;
        const n = parseInt(b.battingOrder, 10);
        if (isNaN(n)) continue;
        const slot = Math.floor(n / 100);
        if (slot >= 1 && slot <= 9) map.set(b.playerId, slot);
      }
    };
    addSide(boxScore.away.batting);
    addSide(boxScore.home.batting);
    return map;
  }, [boxScore]);
  const latest: PlayUpdate | null = replayUpdates.length > 0 ? replayUpdates[replayUpdates.length - 1] : null;

  // Video clips (PROMPT_video_clips.md). On load, only the light play → clip
  // index (Watch buttons, scorecard marks), re-fetched on each new play or
  // every 60s. The full list (titles, media) loads on demand: the Highlights
  // row opening, or a clip being played (PROMPT_highlights_lazy.md).
  const clipIndex = useGameClipIndex(game?.providerGameId, latest?.atBatIndex);
  const fullClips = useLazyGameClips(game?.providerGameId);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const pitchByPitchAnchorRef = useRef<HTMLDivElement>(null);
  const { ensure: ensureClip } = fullClips;
  const playClip = useCallback((id: string): void => {
    setActiveClipId(id);
    ensureClip(id);
  }, [ensureClip]);
  const playClipFromHighlights = useCallback((id: string): void => {
    playClip(id);
    pitchByPitchAnchorRef.current?.scrollIntoView({ block: "start" });
  }, [playClip]);
  // Replay/Scout mode: a clip is offered only once the marker has passed the
  // end of its at-bat — an unmatched clip (no play) has nothing to gate it
  // against, so it's always visible (§2e).
  const gate = <T extends { atBatIndex: number | null }>(list: readonly T[]): T[] =>
    isFinalGame
      ? list.filter((c) => c.atBatIndex == null || (markerAtBatIndex != null && c.atBatIndex <= markerAtBatIndex))
      : [...list];
  const visibleClipIndex = gate(clipIndex);
  const visibleClips = gate(fullClips.clips);
  const clipsThrough = isFinalGame && latest != null ? `${latest.half === "top" ? "▲" : "▼"}${ordinal(latest.inning)}` : null;

  // Who's on each base right now — [1B, 2B, 3B] display names — sourced straight
  // from the server's per-play matchup.postOnFirst/Second/Third (real MLB data,
  // not reconstructed client-side; a from-scratch client heuristic here produced
  // wrong names because its own base-occupancy tracking can drift from the
  // server's authoritative bases.on1/on2/on3 over a long game).
  const currentOnBaseNames: readonly [string | null, string | null, string | null] =
    latest != null
      ? [latest.onBaseFirst ?? null, latest.onBaseSecond ?? null, latest.onBaseThird ?? null]
      : [null, null, null];

  // Between the 3rd out and the next half's first pitch, MLB's feed has
  // nothing new to give us — the poller never publishes. `latest` still
  // truthfully reflects the play that just ended (e.g. "3 outs, strikeout"),
  // so we leave it as-is everywhere and only add a distinct "due up next"
  // signal, derived from box score lineup order, for the transition surfaces
  // (PROMPT_half_inning_transition.md).
  const inHalfInningTransition = !isFinalGame && isHalfInningTransition(latest);
  const dueUpNext = useMemo(
    () => (inHalfInningTransition && latest != null && boxScore != null && game != null
      ? deriveDueUpNext(latest, boxScore, replayUpdates, completedAtBats, { homeAbbr: game.homeAbbr, awayAbbr: game.awayAbbr })
      : null),
    [inHalfInningTransition, latest, boxScore, replayUpdates, completedAtBats, game],
  );
  const halfJustEnded = useMemo(
    () => (inHalfInningTransition && latest != null ? deriveHalfJustEnded(latest, replayUpdates) : null),
    [inHalfInningTransition, latest, replayUpdates],
  );

  // Context label shown in ScoutControls: "▲ 3 · Kyle Tucker"
  const scoutContextLabel: string | null = latest != null
    ? `${latest.half === "top" ? "▲" : "▼"} ${latest.inning} · ${latest.batterName ?? "—"}`
    : null;

  // Season slash line for the currently replaying / live batter
  const { batterInfo } = useBatterInfo(latest?.batterId ?? null);

  // Match current pitcher against boxscore pitching lines
  const pitcherLine: PitcherLineDto | null = useMemo(() => {
    if (boxScore == null || latest?.pitcherName == null) return null;
    const name = latest.pitcherName;
    return (
      boxScore.home.pitching.find((p: PitcherLineDto) => p.name === name) ??
      boxScore.away.pitching.find((p: PitcherLineDto) => p.name === name) ??
      null
    );
  }, [boxScore, latest?.pitcherName]);

  // Head-aware pitcher stats for scout mode — derived from replayUpdates (sliced at head).
  // boxScore pitching lines always show full-game totals; this replaces IP/H/R/K while scrubbing.
  const scoutPitcherLine = useMemo(() => {
    if (!isFinalGame || latest?.pitcherName == null) return null;
    const pitcher = latest.pitcherName;
    const HIT_SET = new Set(['Single', 'Double', 'Triple', 'HomeRun']);
    const OUT_RESULTS = ['Strikeout', 'Groundout', 'Flyout', 'Lineout', 'PopOut', 'Out', 'SacFly', 'SacBunt', 'CaughtStealing', 'Pickoff'];
    const seenABs = new Set<number>();
    let totalOuts = 0, h = 0, r = 0, so = 0;
    let prevAway = replayUpdates[0]?.awayScore ?? 0;
    let prevHome = replayUpdates[0]?.homeScore ?? 0;
    for (const u of replayUpdates) {
      if (u.pitcherName === pitcher) {
        r += u.half === 'top'
          ? Math.max(0, u.awayScore - prevAway)
          : Math.max(0, u.homeScore - prevHome);
        if (u.playResult != null && u.atBatIndex != null && !seenABs.has(u.atBatIndex)) {
          seenABs.add(u.atBatIndex);
          if (HIT_SET.has(u.playResult)) h++;
          if (u.playResult === 'Strikeout') so++;
          const outs = u.playResult === 'DoublePlay' ? 2 : u.playResult === 'TriplePlay' ? 3 : OUT_RESULTS.includes(u.playResult) ? 1 : 0;
          totalOuts += outs;
        }
      }
      prevAway = u.awayScore;
      prevHome = u.homeScore;
    }
    const whole = Math.floor(totalOuts / 3);
    const thirds = totalOuts % 3;
    return { ip: thirds === 0 ? `${whole}` : `${whole} ${thirds}/3`, h, r, so };
  }, [isFinalGame, replayUpdates, latest?.pitcherName]);

  // Head-to-head's "on the mound" + handoff line needs the FULL per-side
  // pitching chain (not just the currently-pitching side's line above), so
  // it can name whoever's still ahead of the scrub head as "the reliever",
  // and reconstruct pitching changes already scrubbed past.
  const scoutAwayPitching: PitcherLineDto[] | null = useMemo(
    () => (isFinalGame ? deriveScoutPitchingChain(replayUpdates, 'bottom', boxScore?.away) : null),
    [isFinalGame, replayUpdates, boxScore?.away],
  );
  const scoutHomePitching: PitcherLineDto[] | null = useMemo(
    () => (isFinalGame ? deriveScoutPitchingChain(replayUpdates, 'top', boxScore?.home) : null),
    [isFinalGame, replayUpdates, boxScore?.home],
  );

  type GameTeamMeta = { logoUrl?: string | null };
  const awayMeta = (game?.awayTeamMeta as GameTeamMeta | null) ?? null;
  const homeMeta = (game?.homeTeamMeta as GameTeamMeta | null) ?? null;

  const gameTitle = game != null ? (
    <span className="game-page__title-matchup">
      {awayMeta?.logoUrl && <img src={awayMeta.logoUrl} alt="" className="game-page__title-logo" />}
      <Link to={`/team/${game.awayAbbr}`} className="game-page__title-team-link" state={{ from: location.pathname }}>{game.awayName}</Link>
      <span className="game-page__title-at">@</span>
      <Link to={`/team/${game.homeAbbr}`} className="game-page__title-team-link" state={{ from: location.pathname }}>{game.homeName}</Link>
      {homeMeta?.logoUrl && <img src={homeMeta.logoUrl} alt="" className="game-page__title-logo" />}
    </span>
  ) : `Game ${gameId ?? "(unknown)"}`;


  const isPregame = game?.status === "scheduled" && stableUpdates.length === 0;

  // Subtitle (eyebrow row, context text only): venue · formatted date · first pitch.
  // Countdown and elapsed are status, not context — they live in the h1 row's status slot.
  const venue = (game?.snapshot as { venue?: string } | null | undefined)?.venue ?? null;
  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (venue) parts.push(venue);
    if (game?.gameDate) {
      const d = new Date(`${game.gameDate}T12:00:00`);
      const formatted = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
        .replace(",", "");
      parts.push(formatted);
    }
    if (latest == null && game?.startTimeUtc != null) {
      const { time, ampm } = formatFirstPitchParts(game.startTimeUtc as string);
      if (time !== "—") parts.push(`${time}${ampm.charAt(0).toLowerCase()}`);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [venue, game?.gameDate, game?.startTimeUtc, latest]);

  // Status (h1 row, right): countdown pre-game, LIVE + elapsed live, FINAL once over.
  const statusSlot = isPregame
    ? (countdownLabel != null
      ? <Pill tone="soft" style={{ fontFamily: "var(--font-mono)" }}>{countdownLabel}</Pill>
      : undefined)
    : isFinalGame
    ? (
      <Pill tone="soft" style={{ fontWeight: 700, letterSpacing: "0.1em" }}>
        FINAL{finalInning != null && finalInning > 9 ? <span style={{ color: 'var(--color-accent)' }}> ({finalInning})</span> : null}
      </Pill>
    )
    : game?.status === "live"
    ? (
      <>
        <LivePill />
        {elapsedLabel != null && <span className="num" style={{ marginLeft: 8 }}>{elapsedLabel} elapsed</span>}
      </>
    )
    : undefined;

  // Controls (eyebrow row, right): the view-switch segmented, contextual to pregame/live.
  const controlsSlot = isPregame
    ? (
      <Segmented
        items={["Preview", "Head-to-head"]}
        active={view === "h2h" ? 1 : 0}
        onClick={(i) => setView(i === 0 ? "main" : "h2h")}
      />
    )
    : game?.status === "live"
    ? (
      <Segmented
        items={["Live", "Head-to-head"]}
        active={view === "h2h" ? 1 : 0}
        onClick={(i) => setView(i === 0 ? "main" : "h2h")}
      />
    )
    : undefined;

  // Which team is currently batting — determines LineupsTray default
  const battingTeamAbbr: string = latest != null
    ? (latest.half === "top" ? (game?.awayAbbr ?? "") : (game?.homeAbbr ?? ""))
    : (game?.awayAbbr ?? "");

  // Elapsed game time — ticks every minute while live
  useEffect((): (() => void) => {
    if (game?.startTimeUtc == null || latest == null) {
      setElapsedLabel(null);
      return () => undefined;
    }
    const start = new Date(game.startTimeUtc as unknown as string).getTime();
    const compute = (): void => {
      const diff = Date.now() - start;
      if (diff <= 0) { setElapsedLabel(null); return; }
      const totalSec = Math.floor(diff / 1_000);
      const totalMin = Math.floor(totalSec / 60);
      const h = Math.floor(totalMin / 60);
      if (h >= 1) {
        const m = totalMin % 60;
        setElapsedLabel(`${h}:${String(m).padStart(2, "0")}`);
      } else {
        const m = totalMin;
        const s = totalSec % 60;
        setElapsedLabel(`${m}:${String(s).padStart(2, "0")}`);
      }
    };
    compute();
    const id = window.setInterval(compute, 1_000);
    return () => window.clearInterval(id);
  }, [game?.startTimeUtc, latest]);

  // Pregame countdown — ticks every second until first pitch
  useEffect((): (() => void) => {
    if (game?.startTimeUtc == null || !isPregame) {
      setCountdownLabel(null);
      return () => undefined;
    }
    const start = new Date(game.startTimeUtc as unknown as string).getTime();
    const compute = (): void => {
      const diff = start - Date.now();
      if (diff <= 0) { setCountdownLabel("First pitch any moment"); return; }
      const totalMins = Math.floor(diff / 60_000);
      if (totalMins < 1) { setCountdownLabel("First pitch any moment"); return; }
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      setCountdownLabel(h > 0 ? `First pitch in ${h}h ${m}m` : `First pitch in ${m}m`);
    };
    compute();
    const id = window.setInterval(compute, 1_000);
    return () => window.clearInterval(id);
  }, [game?.startTimeUtc, isPregame]);

  const gameDate = game?.gameDate as string | undefined;

  // History-aware back: go back in router history if it exists, else fall back to the
  // daily games page for this game's date (preserving the selected date in localStorage).
  const hasHistory = location.key !== "default";
  const handleBack = useCallback((): void => {
    if (hasHistory) {
      navigate(-1);
    } else {
      if (gameDate) {
        try { localStorage.setItem("br-selected-date", gameDate); } catch { /* ignore */ }
      }
      navigate("/games");
    }
  }, [navigate, gameDate, hasHistory]);

  // "{Away} at {Home} · {inning}" — built from live state, not hard-coded, so it
  // moves with the game (PROMPT_iq_global.md §1).
  const iqContext = game != null
    ? `${TEAM_NICKNAMES[game.awayAbbr] ?? game.awayName} at ${TEAM_NICKNAMES[game.homeAbbr] ?? game.homeName}` +
      (latest != null ? ` · ${ordinal(latest.inning)}` : isFinalGame ? " · Final" : "")
    : undefined;

  // Reuses the same backend the game view's (now-retired) band-mounted panel used —
  // the only page with a real Baseball IQ answer source today.
  const onAskIQ = useCallback(async (question: string, history: ConversationTurn[]): Promise<IqAnswer | null> => {
    try {
      const res = await fetch("/api/iq/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game?.providerGameId ?? "",
          updateIndex: replayUpdates.length - 1,
          question,
          conversationHistory: history,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json() as { ok: boolean; headline: string; unit?: string; sub: string };
      return data.ok ? { headline: data.headline, unit: data.unit, sub: data.sub } : null;
    } catch {
      return null;
    }
  }, [game?.providerGameId, replayUpdates.length]);

  return (
    <section className="game-page">
      <BrandHeader active="games" maxWidth={1600} iqContext={iqContext} onAskIQ={onAskIQ} />
      <PageTitle
        title={gameTitle}
        subtitle={subtitle ?? undefined}
        right={statusSlot}
        subtitleRight={controlsSlot}
        className="game-page__title"
        returnTo={returnLabel != null ? { label: returnLabel, onClick: handleBack } : undefined}
      />

      {isLoading && <p className="game-page__status">Loading game…</p>}
      {error !== null && <p className="game-page__status game-page__status--error">{error}</p>}
      {!isLoading && error === null && game == null && (
        <p className="game-page__status">Game not found.</p>
      )}

      {!isLoading && error === null && game != null && isPregame && (
        <div className="game-page__body">
          <div className="gp__col">
            {view === "h2h" ? (
              <HeadToHeadScreen game={game} boxScore={boxScore} />
            ) : (
              <PregameView
                game={game}
                lineupsOpen={lineupsOpen && !lineupsClosing}
                onToggleLineups={toggleLineups}
              />
            )}
          </div>
        </div>
      )}

      {!isLoading && error === null && game != null && !isPregame && (
        <div className="game-page__body">
          <div className="gp__col">
          {/* Dormant watching strip */}
          {watchedGameIds.filter((id) => id !== gameId).some((id) => gameOverrides.has(id)) && (
            <div className="game-watching-strip">
              {watchedGameIds
                .filter((id) => id !== gameId)
                .map((id) => {
                  const ws = gameOverrides.get(id);
                  if (ws == null) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`game-watching-card${ws.phase === "LIVE" ? " is-live" : ""}`}
                      onClick={() => navigate(`/game/${id}`, { state: { from: location.pathname } })}
                    >
                      <span className="gwc-matchup">
                        {ws.awayAbbr} <span className="gwc-score">{ws.awayScore ?? "—"}</span>
                        {" · "}
                        <span className="gwc-score">{ws.homeScore ?? "—"}</span> {ws.homeAbbr}
                      </span>
                      {ws.statusText !== "" && <span className="gwc-status">{ws.statusText}</span>}
                    </button>
                  );
                })}
            </div>
          )}

          {/* Line score band — always visible even in H2H mode */}
          <LineScoreBand game={game} latest={latest} allUpdates={replayUpdates} boxScore={boxScore} isFinal={isFinalGame} />

          {view === "h2h" ? (
            <HeadToHeadScreen
              game={game}
              boxScore={boxScore}
              initialSide={latest != null ? (latest.half === "top" ? game.awayAbbr : game.homeAbbr) : undefined}
              initialSlot={latest?.batterId != null ? (orderByBatter.get(latest.batterId) ?? 1) : undefined}
              awayPitchingOverride={scoutAwayPitching ?? undefined}
              homePitchingOverride={scoutHomePitching ?? undefined}
            />
          ) : null}

          {view !== "h2h" && <>
            {/* Two-column hero row: sticky left col (MatchupLeft + MatchupContext) | PitchByPitchV2 */}
            <div className={`game-page__hero-grid${scorecardOpen ? " game-page__hero-grid--scorecard" : ""}`}>
              <div className="game-page__left-col">
                <MatchupLeft
                  game={game}
                  latest={latest}
                  currentAtBat={currentAtBat}
                  dueUpNext={dueUpNext}
                  completedAtBats={completedAtBats}
                  batterInfo={batterInfo}
                  orderByBatter={orderByBatter}
                  lineupsOpen={lineupsOpen && !lineupsClosing}
                  onToggleLineups={toggleLineups}
                  allCompletedAtBats={isFinalGame ? allCompletedAtBats : undefined}
                  markerAtBatIndex={isFinalGame ? markerAtBatIndex : undefined}
                  onSeekToBat={isFinalGame ? seekToAb : undefined}
                  scorecardOpen={scorecardOpen}
                  scorecardFading={scorecardFading}
                  runnerFinalBaseByAtBat={runnerFinalBaseByAtBat}
                  currentOnBaseNames={currentOnBaseNames}
                />
                {!scorecardOpen && (
                  <div className={scorecardFading ? 'game-page__context-fade' : undefined}>
                    <MatchupContext
                      latest={latest}
                      currentAtBat={currentAtBat}
                      completedAtBats={completedAtBats}
                      boxScore={boxScore}
                      pitcherMlbId={pitcherLine?.playerId ?? null}
                      gameId={gameId}
                      pitcherLine={pitcherLine}
                      game={game}
                      scoutLine={scoutPitcherLine}
                      dueUpNext={dueUpNext}
                      halfJustEnded={halfJustEnded}
                    />
                  </div>
                )}
              </div>
              <div className="game-page__right-anchor" ref={pitchByPitchAnchorRef}>
                <div className="game-page__right-col">
                  <PitchByPitchV2
                    completedAtBats={completedAtBats}
                    currentAtBat={currentAtBat}
                    game={game}
                    boxScore={boxScore}
                    scoringByAtBat={scoringByAtBat}
                    runnerFinalBaseByAtBat={runnerFinalBaseByAtBat}
                    orderByBatter={orderByBatter}
                    isReplayMode={isFinalGame}
                    scoutMode={isFinalGame}
                    allCompletedAtBats={isFinalGame ? allCompletedAtBats : undefined}
                    markerAtBatIndex={isFinalGame ? markerAtBatIndex : undefined}
                    onSeek={isFinalGame ? seekToAb : undefined}
                    flipped={scorecardOpen}
                    onFlipChange={handleScorecardFlip}
                    dueUpNext={dueUpNext}
                    clips={visibleClipIndex}
                    playerClips={visibleClips}
                    playingClipId={activeClipId}
                    onPlayClip={playClip}
                    onCloseClip={() => setActiveClipId(null)}
                    scoutControls={isFinalGame ? {
                      playing: scoutPlaying,
                      onToggle: togglePlay,
                      onStep: stepPitch,
                      onStepBatter: stepAb,
                      markerMoment: scoutMarkerIdx,
                      totalMoments: stableUpdates.length,
                      contextLabel: scoutContextLabel,
                      inningOptions,
                      onSeekInning: setScoutMarkerIdx,
                      speed: scoutSpeed,
                      onSpeedChange: setScoutSpeed,
                      runMarkers: scoutRunMarkers,
                      halfInnings: scoutHalfInnings,
                    } : undefined}
                  />
                </div>
              </div>
            </div>

            {/* PitcherCard retired — content moved to MatchupContext header strip (§3) */}

            {/* Win prob + leverage — half-width cards in a row */}
            {isFinalGame && winProbPts.length === 0 && currentLeverage == null && (
              <div className="game-page__analytics-waiting">Waiting for data…</div>
            )}
            {(winProbPts.length > 0 || currentLeverage != null) && (
              <div className="game-page__analytics-row">
                {winProbPts.length > 0 && (() => {
                  type TeamMeta = { primaryColorHex?: string | null };
                  const hMeta = game.homeTeamMeta as TeamMeta | null;
                  const aMeta = game.awayTeamMeta as TeamMeta | null;
                  return (
                    <WinProbTimeline
                      pts={winProbPts}
                      homeAbbr={game.homeAbbr}
                      awayAbbr={game.awayAbbr}
                      homePrimary={hMeta?.primaryColorHex ?? "var(--color-accent)"}
                      awayPrimary={aMeta?.primaryColorHex ?? "var(--color-info)"}
                    />
                  );
                })()}
                {currentLeverage != null && (
                  <LeverageCard
                    current={currentLeverage}
                    peak={peakLeverage}
                    situation={latest != null ? { bases: latest.bases, outs: latest.outs } : null}
                    betweenInnings={inHalfInningTransition}
                  />
                )}
              </div>
            )}

            {/* Last thing on the page — recent plays already have Watch
                buttons; this looks back across the whole game (PROMPT_video_clips.md §2d). */}
            <GameHighlightsRow
              key={game.providerGameId ?? undefined}
              clips={visibleClips}
              status={fullClips.status}
              onOpen={fullClips.load}
              activeId={activeClipId}
              onPlay={playClipFromHighlights}
              through={clipsThrough}
            />
          </>}
          </div>
        </div>
      )}

      {/* Dev connection indicator */}
      {watchedGameIds.length > 0 && (
        <div className="game-page__conn-indicator">
          {isConnected ? "● connected" : "● disconnected"}
          {connectionError != null && ` (${connectionError})`}
        </div>
      )}

      {/* Lineups tray — position: absolute, contained to .game-page */}
      {game != null && (lineupsOpen || lineupsClosing) && (
        <LineupsTray
          open={lineupsOpen}
          onClose={closeLineups}
          closing={lineupsClosing}
          boxScore={boxScore}
          game={game}
          battingTeamAbbr={battingTeamAbbr}
        />
      )}
    </section>
  );
}
