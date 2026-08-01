import "./GamePage.css";
import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import type { BoxScoreDto, GameViewDto, PitcherLineDto } from "@bitslinger21/baseball-realtime-client";
import { gamesApi, boxScoreApi } from "../api/baseballApiClient";
import { useRealtimeGame } from "../realtime/useRealtimeGame";
import type { PlayUpdate } from "../realtime/types";
import { useRealtimeDailyGames } from "../realtime/useRealtimeDailyGames";
import { useAtBatHistory } from "../hooks/useAtBatHistory";
import { useBatterInfo } from "../hooks/useBatterInfo";
import type { ScoringInfo } from "./game/PitchByPitchV2";

import { useTopbarReturn } from "../App";
import { PageTitle } from "../components/primitives/PageTitle";
import { LivePill, Pill } from "../components/primitives/Pill";
import { Segmented } from "../components/primitives/Segmented";

import { LineScoreBand } from "./game/LineScoreBand";
import { MatchupLeft } from "./game/MatchupLeft";
import { MatchupContext } from "./game/MatchupContext";
import { PitchByPitchV2 } from "./game/PitchByPitchV2";
import { PitcherCard } from "./game/PitcherCard";
import { scoutPositionStore } from "./game/scoutPositionStore";
import { WinProbTimeline, type WinProbPoint } from "./game/WinProbTimeline";
import { LeverageCard } from "./game/LeverageCard";
import { LineupsTray } from "./game/LineupsTray";
import { PregameView, formatFirstPitchParts } from "./game/PregameView";
import { HeadToHeadScreen } from "./game/HeadToHeadScreen";
import { AlertHistoryDrawer } from "./AlertHistoryDrawer";

export function GamePage(): ReactElement {
  const { providerGameId } = useParams();
  const gameId: string | null = providerGameId ?? null;
  const navigate = useNavigate();
  const location = useLocation();
  // Status hint passed by the landing page at navigation time — lets us show the
  // correct pill immediately, before the REST fetch or socket update resolves.
  const navStatusHint = (location.state as { gameStatus?: string } | null)?.gameStatus ?? null;

  const [game, setGame] = useState<GameViewDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [boxScore, setBoxScore] = useState<BoxScoreDto | null>(null);
  const [alertHistoryOpen, setAlertHistoryOpen] = useState(false);
  const [lineupsOpen, setLineupsOpen] = useState(false);
  const [lineupsClosing, setLineupsClosing] = useState(false);
  const [elapsedLabel, setElapsedLabel] = useState<string | null>(null);
  const [view, setView] = useState<"main" | "h2h">("main");

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

  // Scout mode: one play head for final games. head=1 = first pitch of game.
  // On remount (in-app return to same game), restore the saved head from the store.
  const [scoutHeadIdx, setScoutHeadIdx] = useState(() =>
    providerGameId != null ? (scoutPositionStore.get(providerGameId)?.headIdx ?? 1) : 1
  );
  const [scoutPlaying, setScoutPlaying] = useState(false);
  const [scoutSpeed, setScoutSpeed] = useState(1);

  // Refs for safe access to current values in cleanup callbacks.
  const scoutHeadIdxRef = useRef(scoutHeadIdx);
  useEffect(() => { scoutHeadIdxRef.current = scoutHeadIdx; }, [scoutHeadIdx]);
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
      setScoutHeadIdx(stableUpdates.length);
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
      setScoutHeadIdx(1);
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
          headIdx: scoutHeadIdxRef.current,
          atBatId: stableUpdatesRef.current[scoutHeadIdxRef.current - 1]?.atBatIndex ?? null,
        });
      }
    };
  }, [gameId]);

  // Auto-advance in Scout/Replay mode: one PITCH per tick so each delivery is revealed individually.
  useEffect(() => {
    if (!isFinalGame || !scoutPlaying) return;
    if (scoutHeadIdx >= stableUpdates.length) { setScoutPlaying(false); return; }
    const id = window.setTimeout(() => {
      setScoutHeadIdx((i) => Math.min(i + 1, stableUpdatesRef.current.length));
    }, Math.round(750 / scoutSpeed));
    return () => window.clearTimeout(id);
  }, [isFinalGame, scoutPlaying, scoutHeadIdx, stableUpdates.length, scoutSpeed]);

  const replayUpdates: readonly PlayUpdate[] = isFinalGame
    ? stableUpdates.slice(0, scoutHeadIdx)
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
    let lastKnownIdx: number | null = replayUpdates[0].atBatIndex ?? null;

    for (let i = 1; i < replayUpdates.length; i++) {
      const u = replayUpdates[i];
      const runs = (u.awayScore - prevAway) + (u.homeScore - prevHome);
      const curIdx = u.atBatIndex ?? null;

      if (runs > 0) {
        // Use lastKnownIdx only when the at-bat changed AND this update carries no
        // playResult — that's genuine score-lag (a runner scoring from a previous play
        // whose score update arrives late). If playResult is present, the scoring event
        // is THIS at-bat even if atBatIndex just changed (feed batched the transition).
        const isLag = curIdx != null && lastKnownIdx != null
          && curIdx !== lastKnownIdx
          && !u.playResult;
        const targetIdx = isLag ? lastKnownIdx : (curIdx ?? lastKnownIdx);

        if (targetIdx != null) {
          const ex = result.get(targetIdx);
          result.set(targetIdx, {
            runs: (ex?.runs ?? 0) + runs,
            awayScore: u.awayScore,
            homeScore: u.homeScore,
            awayAbbr: game.awayAbbr,
            homeAbbr: game.homeAbbr,
          });
        }
      }

      prevAway = u.awayScore;
      prevHome = u.homeScore;
      if (curIdx != null) lastKnownIdx = curIdx;
    }

    return result;
  }, [replayUpdates, game]);

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
  const headAtBatIndex: number | null = isFinalGame && scoutHeadIdx > 0
    ? (stableUpdates[scoutHeadIdx - 1]?.atBatIndex ?? null)
    : null;

  // Seek the head to the last pitch of the given atBatIndex, then pause.
  const seekToAb = useCallback((targetAtBatIndex: number): void => {
    let lastIdx = 1;
    for (let i = 0; i < stableUpdates.length; i++) {
      if (stableUpdates[i].atBatIndex === targetAtBatIndex) lastIdx = i + 1;
    }
    setScoutHeadIdx(lastIdx);
    setScoutPlaying(false);
  }, [stableUpdates]);

  // Step forward or backward one at-bat.
  const stepAb = useCallback((dir: -1 | 1): void => {
    if (headAtBatIndex == null || allCompletedAtBats.length === 0) return;
    const curPos = allCompletedAtBats.findIndex((ab) => ab.atBatIndex === headAtBatIndex);
    if (curPos === -1) return;
    const nextPos = curPos + dir;
    if (nextPos < 0 || nextPos >= allCompletedAtBats.length) return;
    seekToAb(allCompletedAtBats[nextPos].atBatIndex);
  }, [headAtBatIndex, allCompletedAtBats, seekToAb]);

  // Toggle play/pause. Restarting from the beginning if at the end.
  const togglePlay = useCallback((): void => {
    if (!scoutPlaying && scoutHeadIdx >= stableUpdates.length) setScoutHeadIdx(1);
    setScoutPlaying((p) => !p);
  }, [scoutPlaying, scoutHeadIdx, stableUpdates.length]);

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

  const gameTitle = game != null
    ? `${game.awayName} @ ${game.homeName}`
    : `Game ${gameId ?? "(unknown)"}`;

  // Eyebrow: venue · formatted date · inning (above the title)
  const venue = (game?.snapshot as { venue?: string } | null | undefined)?.venue ?? null;
  const eyebrow = useMemo(() => {
    const parts: string[] = [];
    if (venue) parts.push(venue.toUpperCase());
    if (game?.gameDate) {
      const d = new Date(`${game.gameDate}T12:00:00`);
      const formatted = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
        .replace(",", "").toUpperCase();
      parts.push(formatted);
    }
    if (latest != null) {
      const arrow = latest.half === "top" ? "▲" : "▼";
      const n = latest.inning;
      const suffix = n === 1 ? "ST" : n === 2 ? "ND" : n === 3 ? "RD" : "TH";
      parts.push(`${arrow} ${n}${suffix}`);
    } else if (game?.startTimeUtc != null) {
      const { time, ampm } = formatFirstPitchParts(game.startTimeUtc as string);
      if (time !== "—") parts.push(`${time}${ampm.charAt(0).toLowerCase()} ET`);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [venue, game?.gameDate, game?.startTimeUtc, latest]);

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
      const totalMins = Math.floor(diff / 60_000);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      setElapsedLabel(`${h}:${String(m).padStart(2, "0")}`);
    };
    compute();
    const id = window.setInterval(compute, 60_000);
    return () => window.clearInterval(id);
  }, [game?.startTimeUtc, latest]);

  const isPregame = game?.status === "scheduled" && stableUpdates.length === 0;

  // Inject "← Back to games" into the global topbar right slot.
  // Navigate back to the daily schedule for this game's date so the browsed
  // date is preserved even if the user came from a bookmark or share link.
  const { set: setTopbarReturn } = useTopbarReturn();
  const gameDate = game?.gameDate as string | undefined;
  useEffect(() => {
    const handleBack = (): void => {
      if (gameDate) {
        try { localStorage.setItem("br-selected-date", gameDate); } catch { /* ignore */ }
      }
      navigate("/");
    };
    setTopbarReturn(
      <button type="button" className="app-back-button" onClick={handleBack}>
        ← Back to games
      </button>
    );
    return () => setTopbarReturn(null);
  }, [navigate, setTopbarReturn, gameDate]);

  return (
    <section className="game-page">
      <PageTitle
        eyebrow={eyebrow ?? undefined}
        title={gameTitle}
        subtitleRight={
          isPregame ? (
            <Pill tone="info" style={{ fontWeight: 700, letterSpacing: "0.1em" }}>SCHEDULED</Pill>
          ) : isFinalGame ? (
            <Pill tone="soft" style={{ fontWeight: 700, letterSpacing: "0.1em" }}>FINAL</Pill>
          ) : game?.status === "live" ? (
            <div className="game-page__live-group">
              <LivePill />
              {elapsedLabel != null && (
                <Pill tone="soft" style={{ fontFamily: "var(--font-mono)" }}>{elapsedLabel} elapsed</Pill>
              )}
            </div>
          ) : undefined
        }
        right={
          isPregame ? (
            <Segmented
              items={["Preview", "Head-to-head"]}
              active={view === "h2h" ? 1 : 0}
              onClick={(i) => setView(i === 0 ? "main" : "h2h")}
            />
          ) : game?.status === "live" ? (
            <Segmented
              items={["Live", "Head-to-head"]}
              active={view === "h2h" ? 1 : 0}
              onClick={(i) => setView(i === 0 ? "main" : "h2h")}
            />
          ) : undefined
        }
        className="game-page__title"
      />

      {isLoading && <p className="game-page__status">Loading game…</p>}
      {error !== null && <p className="game-page__status game-page__status--error">{error}</p>}
      {!isLoading && error === null && game == null && (
        <p className="game-page__status">Game not found.</p>
      )}

      {!isLoading && error === null && game != null && isPregame && (
        <div className="game-page__body">
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
      )}

      {!isLoading && error === null && game != null && !isPregame && (
        <div className="game-page__body">
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
                      onClick={() => navigate(`/game/${id}`)}
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
            <div className="game-page__hero-grid">
              <div className="game-page__left-col">
                <MatchupLeft
                  game={game}
                  latest={latest}
                  currentAtBat={currentAtBat}
                  completedAtBats={completedAtBats}
                  batterInfo={batterInfo}
                  orderByBatter={orderByBatter}
                  lineupsOpen={lineupsOpen && !lineupsClosing}
                  onToggleLineups={toggleLineups}
                  allCompletedAtBats={isFinalGame ? allCompletedAtBats : undefined}
                  headAtBatIndex={isFinalGame ? headAtBatIndex : undefined}
                  onSeekToBat={isFinalGame ? seekToAb : undefined}
                />
                <MatchupContext
                  latest={latest}
                  currentAtBat={currentAtBat}
                  completedAtBats={completedAtBats}
                  boxScore={boxScore}
                  pitcherMlbId={pitcherLine?.playerId ?? null}
                  gameId={gameId}
                />
              </div>
              <div className="game-page__right-anchor">
                <div className="game-page__right-col">
                  <PitchByPitchV2
                    completedAtBats={completedAtBats}
                    currentAtBat={currentAtBat}
                    game={game}
                    boxScore={boxScore}
                    scoringByAtBat={scoringByAtBat}
                    orderByBatter={orderByBatter}
                    isReplayMode={isFinalGame}
                    scoutMode={isFinalGame}
                    allCompletedAtBats={isFinalGame ? allCompletedAtBats : undefined}
                    headAtBatIndex={isFinalGame ? headAtBatIndex : undefined}
                    onSeek={isFinalGame ? seekToAb : undefined}
                    scoutControls={isFinalGame ? {
                      playing: scoutPlaying,
                      onToggle: togglePlay,
                      onStep: stepAb,
                      headMoment: scoutHeadIdx,
                      totalMoments: stableUpdates.length,
                      contextLabel: scoutContextLabel,
                      inningOptions,
                      onSeekInning: setScoutHeadIdx,
                      speed: scoutSpeed,
                      onSpeedChange: setScoutSpeed,
                    } : undefined}
                  />
                </div>
              </div>
            </div>

            {/* Pitcher card — full width */}
            <PitcherCard latest={latest} pitcherLine={pitcherLine} game={game} scoutLine={scoutPitcherLine} />

            {/* Win prob + leverage — half-width cards in a row */}
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
