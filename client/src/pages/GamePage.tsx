import "./GamePage.css";
import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";

import type { BoxScoreDto, GameViewDto, PitcherLineDto } from "@bitslinger21/baseball-realtime-client";
import { gamesApi, boxScoreApi } from "../api/baseballApiClient";
import { useRealtimeGame } from "../realtime/useRealtimeGame";
import type { PlayUpdate } from "../realtime/types";
import { useRealtimeDailyGames } from "../realtime/useRealtimeDailyGames";
import { useAtBatHistory } from "../hooks/useAtBatHistory";
import { useBatterInfo } from "../hooks/useBatterInfo";
import type { ScoringInfo } from "./game/PitchByPitchV2";

import { BrandHeader } from "../components/primitives/BrandHeader";
import { getBackLabel } from "../utils/backLabel";
import { PageTitle } from "../components/primitives/PageTitle";
import { LivePill, Pill } from "../components/primitives/Pill";
import { Segmented } from "../components/primitives/Segmented";

import { LineScoreBand } from "./game/LineScoreBand";
import { MatchupLeft } from "./game/MatchupLeft";
import { MatchupContext } from "./game/MatchupContext";
import { PitchByPitchV2 } from "./game/PitchByPitchV2";
import { scoutPositionStore } from "./game/scoutPositionStore";
import { WinProbTimeline, type WinProbPoint } from "./game/WinProbTimeline";
import { LeverageCard } from "./game/LeverageCard";
import { LineupsTray } from "./game/LineupsTray";
import { PregameView, formatFirstPitchParts } from "./game/PregameView";
import { HeadToHeadScreen } from "./game/HeadToHeadScreen";
import { isHalfInningTransition, deriveDueUpNext } from "./game/halfInningTransition";
import { AlertHistoryDrawer } from "./AlertHistoryDrawer";

export function GamePage(): ReactElement {
  const { providerGameId } = useParams();
  const gameId: string | null = providerGameId ?? null;
  const navigate = useNavigate();
  const location = useLocation();
  // Status hint passed by the landing page at navigation time — lets us show the
  // correct pill immediately, before the REST fetch or socket update resolves.
  const locState = location.state as { gameStatus?: string; from?: string; fromLabel?: string } | null;
  const navStatusHint = locState?.gameStatus ?? null;
  const backLabel = getBackLabel(locState?.from, locState?.fromLabel);

  const [game, setGame] = useState<GameViewDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [boxScore, setBoxScore] = useState<BoxScoreDto | null>(null);
  const [alertHistoryOpen, setAlertHistoryOpen] = useState(false);
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
    alerts,
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

  // Runner-advancement: maps atBatIndex → final base reached (4 = scored).
  // Uses play-result-based inference (not base-state diffs) so runners are correctly
  // identified even when a new runner occupies the same base in the same play
  // (e.g., Trammell scores from 3B on a double while Diaz simultaneously advances to 3B).
  // Maps runner's atBatIndex → ordered list of base stops BEYOND their own PA result.
  // Each entry: { base: 1-4, advancedByAtBatIndex: the batter whose play drove the advancement }.
  const runnerFinalBaseByAtBat = useMemo((): ReadonlyMap<number, ReadonlyArray<{ base: number; advancedByAtBatIndex?: number }>> => {
    if (replayUpdates.length === 0) return new Map();
    const result = new Map<number, Array<{ base: number; advancedByAtBatIndex?: number }>>();

    // For each atBatIndex, keep only the LAST update that qualifies as final.
    // Without this, multiple pitch-level updates for the same AB (all marked isFinalPitchOfAtBat=true
    // by the old server logic) would process the same AB twice: the second pass sees the batter
    // already sitting in b1/b2/b3 (placed by the first pass) and spuriously advances them further.
    const lastFinalUpdateByIdx = new Map<number, (typeof replayUpdates)[0]>();
    const nameByIdx = new Map<number, string>();
    for (const u of replayUpdates) {
      if (u.atBatIndex != null && u.batterName != null) nameByIdx.set(u.atBatIndex, u.batterName);
      if (u.playResult != null && u.atBatIndex != null && u.isFinalPitchOfAtBat !== false) {
        lastFinalUpdateByIdx.set(u.atBatIndex, u);
      }
    }
    const abLabel = (idx: number): string => {
      const name = nameByIdx.get(idx);
      return name != null ? `AB#${idx}(${name})` : `AB#${idx}`;
    };

    let b1: number | null = null; // runner atBatIndex at 1B (ab1 intentionally omitted — never read)
    let b2: number | null = null, ab2: number | undefined;
    let b3: number | null = null, ab3: number | undefined;
    let curInning = replayUpdates[0].inning;
    let curHalf = replayUpdates[0].half;

    const BASE_NAMES = ['', '1B', '2B', '3B', 'HOME'];

    // Track cumulative score to compute runs-scored delta per play.
    // Needed in the catch-all to distinguish "runner scored → base vacated" from
    // "inning ended → all bases reset to empty" (end-of-inning side-change).
    let prevAwayScore = 0;
    let prevHomeScore = 0;

    // Append a base stop for a runner. Only records if base > last recorded base.
    const recordAdvance = (runnerIdx: number, base: number, advancedBy?: number): void => {
      let entries = result.get(runnerIdx);
      if (entries == null) { entries = []; result.set(runnerIdx, entries); }
      const lastBase = entries.length > 0 ? entries[entries.length - 1].base : 0;
      if (base > lastBase) {
        entries.push({ base, advancedByAtBatIndex: advancedBy });
        console.log(
          `[scorecard] ${abLabel(runnerIdx)} → ${BASE_NAMES[base] ?? base}` +
          (advancedBy != null ? ` (driven by ${abLabel(advancedBy)})` : ' (own PA)'),
        );
      }
    };

    const flushInning = (): void => {
      // Stranded runners — only record if they were advanced beyond their own PA (ab != null).
      if (b3 != null && ab3 != null) recordAdvance(b3, 3, ab3);
      if (b2 != null && ab2 != null) recordAdvance(b2, 2, ab2);
      b1 = b2 = b3 = null;
      ab2 = ab3 = undefined;
    };

    for (const u of replayUpdates) {
      if (u.inning !== curInning || u.half !== curHalf) {
        flushInning();
        curInning = u.inning;
        curHalf = u.half;
      }

      const pr = u.playResult;
      const idx = u.atBatIndex;
      // isFinalPitchOfAtBat=false means the server knows this pitch is mid-AB;
      // skip even if playResult is populated (stale/cached data guard).
      if (pr == null || idx == null || u.isFinalPitchOfAtBat === false) continue;
      // Only process the last qualifying update for each AB — earlier ones for the same AB
      // would re-enter the same play-result branch and advance the batter as if they were a prior runner.
      if (lastFinalUpdateByIdx.get(idx) !== u) continue;

      const after = u.bases;
      // Runs actually scored by the batting team on this play (delta vs. last processed play).
      const runsThisPlay = Math.max(0, u.half === 'top'
        ? u.awayScore - prevAwayScore
        : u.homeScore - prevHomeScore);
      console.log(
        `[scorecard] processing ${abLabel(idx)} result=${pr} ` +
        `bases={on1:${after.on1},on2:${after.on2},on3:${after.on3}} ` +
        `runners={b1:${b1 != null ? abLabel(b1) : null},b2:${b2 != null ? abLabel(b2) : null},b3:${b3 != null ? abLabel(b3) : null}} ` +
        `score=${u.awayScore}-${u.homeScore} desc="${u.description ?? ''}"`,
      );

      if (pr === 'HomeRun') {
        if (b1 != null) { recordAdvance(b1, 4, idx); b1 = null; }
        if (b2 != null) { recordAdvance(b2, 4, idx); b2 = null; ab2 = undefined; }
        if (b3 != null) { recordAdvance(b3, 4, idx); b3 = null; ab3 = undefined; }
        // Batter's HR is handled by playResultToCellProps directly.
      } else if (pr === 'Triple') {
        if (b1 != null) { recordAdvance(b1, 4, idx); b1 = null; }
        if (b2 != null) { recordAdvance(b2, 4, idx); b2 = null; ab2 = undefined; }
        if (b3 != null) { recordAdvance(b3, 4, idx); b3 = null; ab3 = undefined; }
        if (after.on3) { b3 = idx; ab3 = undefined; }
      } else if (pr === 'Double') {
        if (b3 != null) { recordAdvance(b3, 4, idx); b3 = null; ab3 = undefined; }
        if (b2 != null) {
          // after.on3=true with b1 present means b1 ended at 3B (not that b2 was held there).
          // Only if b1 is absent could after.on3 indicate b2 stopped at 3B.
          if (after.on3 && b1 == null) { recordAdvance(b2, 3, idx); b3 = b2; ab3 = idx; } else { recordAdvance(b2, 4, idx); }
          b2 = null; ab2 = undefined;
        }
        if (b1 != null) {
          if (after.on3 && b3 == null) { recordAdvance(b1, 3, idx); b3 = b1; ab3 = idx; }
          else { recordAdvance(b1, 4, idx); }
          b1 = null;
        }
        if (after.on2) { b2 = idx; ab2 = undefined; }
      } else if (pr === 'Single') {
        if (b3 != null) { recordAdvance(b3, 4, idx); b3 = null; ab3 = undefined; }
        if (b2 != null) {
          // after.on3=true && !after.on2 with b1 present: b2 was pushed to 3B by a sub-event
          // during the PA (WP/SB), then scored on the hit itself. b1 ends at 3B, not b2.
          if (after.on3 && !after.on2 && b1 != null) { recordAdvance(b2, 4, idx); }
          // after.on1=false means the batter reached 2nd (feed-labeled Double); b2 scored HOME.
          else if (after.on3 && !after.on1) { recordAdvance(b2, 4, idx); }
          else if (after.on3) { recordAdvance(b2, 3, idx); b3 = b2; ab3 = idx; }
          else { recordAdvance(b2, 4, idx); }
          b2 = null; ab2 = undefined;
        }
        if (b1 != null) {
          // When batter reached 2nd (!after.on1): after.on3 means b1 stopped at 3B, not 2B.
          if (!after.on1 && after.on3 && b3 == null) { recordAdvance(b1, 3, idx); b3 = b1; ab3 = idx; }
          else if (after.on2 && b2 == null) { recordAdvance(b1, 2, idx); b2 = b1; ab2 = idx; }
          else if (after.on3 && b3 == null) { recordAdvance(b1, 3, idx); b3 = b1; ab3 = idx; }
          else { recordAdvance(b1, 4, idx); }
          b1 = null;
        }
        if (after.on1) { b1 = idx; }
        // Batter reached 2nd (feed-labeled Double): track at b2 instead of b1.
        if (!after.on1 && after.on2 && b2 == null) { b2 = idx; }
      } else if (pr === 'Walk' || pr === 'IntentionalWalk' || pr === 'HitByPitch' || pr === 'HBP') {
        if (b1 != null && b2 != null && b3 != null) {
          recordAdvance(b3, 4, idx); recordAdvance(b2, 3, idx); recordAdvance(b1, 2, idx);
          b3 = b2; ab3 = idx; b2 = b1; ab2 = idx; b1 = idx;
        } else if (b1 != null && b2 != null) {
          recordAdvance(b2, 3, idx); recordAdvance(b1, 2, idx);
          b3 = b2; ab3 = idx; b2 = b1; ab2 = idx; b1 = idx;
        } else if (b1 != null) {
          recordAdvance(b1, 2, idx);
          b2 = b1; ab2 = idx; b1 = idx;
        } else {
          b1 = idx;
        }
      } else if (pr === 'SacFly') {
        if (b3 != null) { recordAdvance(b3, 4, idx); b3 = null; ab3 = undefined; }
        if (b2 != null && after.on3 && b3 == null) { recordAdvance(b2, 3, idx); b3 = b2; ab3 = idx; b2 = null; ab2 = undefined; }
        if (b1 != null && after.on2 && b2 == null) { recordAdvance(b1, 2, idx); b2 = b1; ab2 = idx; b1 = null; }
      } else if (pr === 'Out' || pr === 'Groundout' || pr === 'Flyout' || pr === 'Lineout' ||
                 pr === 'PopOut' || pr === 'Strikeout' || pr === 'DoublePlay' || pr === 'TriplePlay') {
        // Pure outs: runners never advance via the catch-all on an out play.
        // The inning-ending state-reset (all bases clear) must not be misread as scoring.
      } else {
        // Catch-all: handles Outs, FC, WP, PB, BK, SB, etc.
        // Capture BEFORE clearing — clearing before checking prev* would miss the advance.
        // after.bases reflects end-of-play state. Two causes for an empty base:
        //   (a) runner scored — only valid if the batting team's score actually increased.
        //   (b) inning ended — side-change resets all bases to empty; runners are stranded.
        // runsThisPlay guards (a) so we never infer scoring from a side-change reset.
        const prevB3 = b3, prevB2 = b2, prevB1 = b1;
        if (!after.on3 && b3 != null) { b3 = null; ab3 = undefined; }
        if (!after.on2 && b2 != null) { b2 = null; ab2 = undefined; }
        if (!after.on1 && b1 != null) { b1 = null; }
        let runsToRecord = runsThisPlay;
        // Runner at 3B vacated → scored HOME (only if a run was actually scored).
        if (!after.on3 && prevB3 != null && runsToRecord > 0) {
          recordAdvance(prevB3, 4, idx);
          runsToRecord--;
        }
        // Runner at 2B advanced to 3B (drop !after.on2 — when b1 also advanced, after.on2=true
        // because b1 now occupies 2B; the old !after.on2 incorrectly blocked this case).
        // Explicitly clear b2 so prevB1 can be placed at 2B below.
        if (after.on3 && b3 == null && prevB2 != null) {
          recordAdvance(prevB2, 3, idx);
          b3 = prevB2; ab3 = idx;
          b2 = null; ab2 = undefined;
        }
        // Runner at 2B vacated and didn't advance to 3B → scored HOME (gated on actual run).
        if (!after.on2 && !after.on3 && prevB2 != null && runsToRecord > 0) {
          recordAdvance(prevB2, 4, idx);
          runsToRecord--;
        }
        if (after.on2 && !after.on1 && b2 == null && prevB1 != null) {
          recordAdvance(prevB1, 2, idx);
          b2 = prevB1; ab2 = idx;
        } else if (!after.on1 && after.on3 && b3 == null && prevB1 != null) {
          // prevB1 advanced directly to 3B (skipped 2B — aggressive SB, 2B vacated, etc.)
          recordAdvance(prevB1, 3, idx);
          b3 = prevB1; ab3 = idx;
        } else if (!after.on1 && !after.on2 && !after.on3 && prevB1 != null && runsToRecord > 0) {
          // prevB1 scored HOME without stopping at 2B or 3B (rare but possible).
          recordAdvance(prevB1, 4, idx);
          runsToRecord--;
        }
      }
      prevAwayScore = u.awayScore;
      prevHomeScore = u.homeScore;
    }

    flushInning();
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

  // Step forward or backward one at-bat, landing at the start (before first pitch).
  const stepAb = useCallback((dir: -1 | 1): void => {
    if (markerAtBatIndex == null || allCompletedAtBats.length === 0) return;
    const curPos = allCompletedAtBats.findIndex((ab) => ab.atBatIndex === markerAtBatIndex);
    if (curPos === -1) return;
    const nextPos = curPos + dir;
    if (nextPos < 0 || nextPos >= allCompletedAtBats.length) return;
    const targetAtBatIndex = allCompletedAtBats[nextPos].atBatIndex;
    // Find the 0-based index of the first update for the target at-bat.
    // Setting scoutMarkerIdx to that value shows everything up to (but not including)
    // that pitch — i.e., the state right before the first pitch of the target at-bat.
    let firstUpdateIdx = 1;
    for (let i = 0; i < stableUpdates.length; i++) {
      if (stableUpdates[i].atBatIndex === targetAtBatIndex) {
        firstUpdateIdx = Math.max(1, i);
        break;
      }
    }
    setScoutMarkerIdx(firstUpdateIdx);
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

  // Between the 3rd out and the next half's first pitch, MLB's feed has
  // nothing new to give us — the poller never publishes. `latest` still
  // truthfully reflects the play that just ended (e.g. "3 outs, strikeout"),
  // so we leave it as-is everywhere and only add a distinct "due up next"
  // signal, derived from box score lineup order, for MatchupLeft's tile.
  const inHalfInningTransition = !isFinalGame && isHalfInningTransition(latest);
  const dueUpNext = useMemo(
    () => (inHalfInningTransition && latest != null && boxScore != null && game != null
      ? deriveDueUpNext(latest, boxScore, replayUpdates, { homeAbbr: game.homeAbbr, awayAbbr: game.awayAbbr })
      : null),
    [inHalfInningTransition, latest, boxScore, replayUpdates, game],
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
    const OUT_RESULTS = ['Strikeout', 'Groundout', 'Flyout', 'Lineout', 'PopOut', 'Out', 'SacFly', 'SacBunt'];
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
      if (time !== "—") parts.push(`${time}${ampm.charAt(0).toLowerCase()} ET`);
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
      navigate("/");
    }
  }, [navigate, gameDate, hasHistory]);

  return (
    <section className="game-page">
      <BrandHeader backLabel={backLabel} onBack={handleBack} maxWidth={1600} />
      <PageTitle
        title={gameTitle}
        subtitle={subtitle ?? undefined}
        right={statusSlot}
        subtitleRight={controlsSlot}
        className="game-page__title"
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

          {/* Alerts strip */}
          {alerts.length > 0 && (
            <div className="game-page__alerts">
              {alerts.slice(-3).map((a, index) => (
                <div key={`${a.at}-${index}`} className="game-page__alert-chip">
                  <span className="game-page__alert-type">{a.type}</span>
                  <span>{a.note}</span>
                </div>
              ))}
              <button
                type="button"
                className="game-page__alert-history-btn"
                onClick={() => setAlertHistoryOpen(true)}
              >
                Alert history
              </button>
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
                    />
                  </div>
                )}
              </div>
              <div className="game-page__right-anchor">
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
                  />
                )}
              </div>
            )}
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

      <AlertHistoryDrawer
        gameId={gameId}
        open={alertHistoryOpen}
        onClose={() => setAlertHistoryOpen(false)}
      />
    </section>
  );
}
