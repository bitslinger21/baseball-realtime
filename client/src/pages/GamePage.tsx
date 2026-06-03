import "./GamePage.css";
import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type { BoxScoreDto, GameViewDto, PitcherLineDto } from "@bitslinger21/baseball-realtime-client";
import { gamesApi, boxScoreApi } from "../api/baseballApiClient";
import { useRealtimeGame } from "../realtime/useRealtimeGame";
import type { PlayUpdate } from "../realtime/types";
import { useRealtimeDailyGames } from "../realtime/useRealtimeDailyGames";
import { useAtBatHistory } from "../hooks/useAtBatHistory";
import { useBatterInfo } from "../hooks/useBatterInfo";
import { getReplayDelayMs } from "../utils/replayDelay";
import type { ScoringInfo } from "./game/PitchByPitchV2";

import { useTopbarReturn } from "../App";
import { PageTitle } from "../components/primitives/PageTitle";
import { LivePill, Pill } from "../components/primitives/Pill";

import { LineScoreBand } from "./game/LineScoreBand";
import { MatchupLeft } from "./game/MatchupLeft";
import { MatchupContext } from "./game/MatchupContext";
import { PitchByPitchV2 } from "./game/PitchByPitchV2";
import { PitcherCard } from "./game/PitcherCard";
import { WinProbTimeline } from "./game/WinProbTimeline";
import { LeverageCard } from "./game/LeverageCard";
import { LineupsTray } from "./game/LineupsTray";
import { AlertHistoryDrawer } from "./AlertHistoryDrawer";

export function GamePage(): ReactElement {
  const { providerGameId } = useParams();
  const gameId: string | null = providerGameId ?? null;
  const navigate = useNavigate();

  const [game, setGame] = useState<GameViewDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [replayCount, setReplayCount] = useState<number>(0);
  const [boxScore, setBoxScore] = useState<BoxScoreDto | null>(null);
  const [alertHistoryOpen, setAlertHistoryOpen] = useState(false);
  const [lineupsOpen, setLineupsOpen] = useState(false);
  const [lineupsClosing, setLineupsClosing] = useState(false);
  const [elapsedLabel, setElapsedLabel] = useState<string | null>(null);

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

  const replayTimerRef = useRef<number | null>(null);

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

  // Reset replay state on game change
  useEffect((): void => {
    setReplayCount(0);
    if (replayTimerRef.current != null) {
      window.clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
  }, [gameId]);

  const stableUpdates: readonly PlayUpdate[] = useMemo(() => updates, [updates]);

  const replayUpdates: readonly PlayUpdate[] = useMemo(
    () => stableUpdates.slice(0, replayCount),
    [stableUpdates, replayCount],
  );

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
        // If atBatIndex changed on the same update as the score change, the run belongs
        // to the previous at-bat (score-lag edge case); otherwise use the current index.
        const targetIdx = curIdx != null && lastKnownIdx != null && curIdx !== lastKnownIdx
          ? lastKnownIdx
          : (curIdx ?? lastKnownIdx);

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

  // Replay timer — incrementally reveals historical updates
  useEffect((): (() => void) => {
    if (replayTimerRef.current != null) {
      window.clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    if (stableUpdates.length === 0) return () => undefined;

    const scheduleNext = (): void => {
      replayTimerRef.current = window.setTimeout((): void => {
        setReplayCount((cur) => {
          if (cur >= stableUpdates.length) return cur;
          return cur + 1;
        });
      }, getReplayDelayMs());
    };

    if (replayCount < stableUpdates.length) scheduleNext();

    return (): void => {
      if (replayTimerRef.current != null) {
        window.clearTimeout(replayTimerRef.current);
        replayTimerRef.current = null;
      }
    };
  }, [stableUpdates, replayCount]);

  const hasUpdates = replayUpdates.length > 0;
  const latest: PlayUpdate | null = hasUpdates ? replayUpdates[replayUpdates.length - 1] : null;
  const { currentAtBat, completedAtBats } = useAtBatHistory(latest);

  // Season slash line for the current batter
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

  // Daily overrides (watching strip)
  const dateKey = useMemo(
    () => (typeof (game as any)?.gameDate === "string" ? String((game as any).gameDate).slice(0, 10) : null),
    [(game as any)?.gameDate],
  );
  const gameOverrides = useRealtimeDailyGames(dateKey);

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
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [venue, game?.gameDate, latest]);

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

  // Inject "← Today's games" into the global topbar right slot
  const { set: setTopbarReturn } = useTopbarReturn();
  useEffect(() => {
    setTopbarReturn(
      <button type="button" className="app-back-button" onClick={() => navigate("/")}>
        ← Today's games
      </button>
    );
    return () => setTopbarReturn(null);
  }, [navigate, setTopbarReturn]);

  return (
    <section className="game-page">
      <PageTitle
        eyebrow={eyebrow ?? undefined}
        title={gameTitle}
        right={latest != null ? (
          <div className="game-page__live-group">
            <LivePill />
            {elapsedLabel != null && (
              <Pill tone="soft">{elapsedLabel} elapsed</Pill>
            )}
          </div>
        ) : undefined}
        className="game-page__title"
      />

      {isLoading && <p className="game-page__status">Loading game…</p>}
      {error !== null && <p className="game-page__status game-page__status--error">{error}</p>}
      {!isLoading && error === null && game == null && (
        <p className="game-page__status">Game not found.</p>
      )}

      {!isLoading && error === null && game != null && (
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

          {/* Line score band */}
          <LineScoreBand game={game} latest={latest} allUpdates={replayUpdates} boxScore={boxScore} />

          {/* Two-column hero row: sticky left col (MatchupLeft + MatchupContext) | PitchByPitchV2 */}
          <div className="game-page__hero-grid">
            <div className="game-page__left-col">
              <MatchupLeft
                game={game}
                latest={latest}
                currentAtBat={currentAtBat}
                batterInfo={batterInfo}
                lineupsOpen={lineupsOpen && !lineupsClosing}
                onToggleLineups={toggleLineups}
              />
              <MatchupContext
                latest={latest}
                currentAtBat={currentAtBat}
                boxScore={boxScore}
                pitcherMlbId={pitcherLine?.playerId ?? null}
                gameId={gameId}
              />
            </div>
            <PitchByPitchV2
              completedAtBats={completedAtBats}
              currentAtBat={currentAtBat}
              game={game}
              scoringByAtBat={scoringByAtBat}
            />
          </div>

          {/* Pitcher card — full width */}
          <PitcherCard latest={latest} pitcherLine={pitcherLine} game={game} />

          {/* Win prob + leverage — half width each (stubs; hidden when no data) */}
          <WinProbTimeline />
          <LeverageCard />
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
