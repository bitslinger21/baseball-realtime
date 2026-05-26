import "./GamePage.css";
import type { ReactElement } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAtBatHistory } from "../hooks/useAtBatHistory";
import { useNavigate, useParams } from "react-router-dom";

import type { GameViewDto } from "@bitslinger21/baseball-realtime-client";
import { gamesApi } from "../api/baseballApiClient";
import { useRealtimeGame } from "../realtime/useRealtimeGame";
import type { PlayUpdate } from "../realtime/types";

import { PageTitle } from "../components/primitives/PageTitle";
import { LivePill } from "../components/primitives/Pill";
import { ScoreboardStrip } from "./game/ScoreboardStrip";
import { PitchHero } from "./game/PitchHero";
import { PitchByPitch } from "./game/PitchByPitch";
import { LineupCompact } from "./game/LineupCompact";
import { AlertHistoryDrawer } from "./AlertHistoryDrawer";
import { getReplayDelayMs } from "../utils/replayDelay";
import { useRealtimeDailyGames } from "../realtime/useRealtimeDailyGames";

export function GamePage(): ReactElement {
  const { providerGameId } = useParams();
  const gameId: string | null = providerGameId ?? null;
  const navigate = useNavigate();

  const [game, setGame] = useState<GameViewDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [replayCount, setReplayCount] = useState<number>(0);
  const replayTimerRef = useRef<number | null>(null);
  const [alertHistoryOpen, setAlertHistoryOpen] = useState(false);

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
  const hasHydratedFeedRef = useRef<boolean>(false);
  const previousUpdateCountRef = useRef<number>(0);
  const prevCompletedLengthRef = useRef<number>(0);

  const feedScrollRef = useRef<HTMLDivElement | null>(null);
  const prevScrollHeightRef = useRef<number>(0);

  useEffect(() => {
    toggleGameRef.current = toggleGame;
    isActiveRef.current = isActive;
  }, [toggleGame, isActive]);

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
        const stillActive = isActiveRef.current(gameId);
        if (stillActive) {
          toggleGameRef.current(gameId);
        }
      }
      startedWatchingHereRef.current = false;
    };
  }, [gameId]);

  useEffect((): void => {
    const load = async (): Promise<void> => {
      if (gameId == null) {
        setError("No game id provided in URL.");
        return;
      }
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

  useEffect((): void => {
    prevScrollHeightRef.current = 0;
    hasHydratedFeedRef.current = false;
    previousUpdateCountRef.current = 0;
    setReplayCount(0);
    prevCompletedLengthRef.current = 0;

    if (replayTimerRef.current != null) {
      window.clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }

    const el = feedScrollRef.current;
    if (el != null) {
      el.scrollTop = 0;
    }
  }, [gameId]);

  const stableUpdates: readonly PlayUpdate[] = useMemo(() => updates, [updates]);

  const replayUpdates: readonly PlayUpdate[] = useMemo(
    () => stableUpdates.slice(0, replayCount),
    [stableUpdates, replayCount],
  );

  const hasUpdates: boolean = replayUpdates.length > 0;
  const latest: PlayUpdate | null = hasUpdates ? replayUpdates[replayUpdates.length - 1] : null;

  const { currentAtBat, completedAtBats } = useAtBatHistory(latest);

  useLayoutEffect((): void => {
    const el = feedScrollRef.current;
    if (el == null) return;

    const currentCount = replayUpdates.length;
    const previousCount = previousUpdateCountRef.current;
    const nextHeight = el.scrollHeight;

    if (!hasHydratedFeedRef.current) {
      hasHydratedFeedRef.current = true;
      previousUpdateCountRef.current = currentCount;
      prevScrollHeightRef.current = nextHeight;
      el.scrollTop = 0;
      return;
    }

    const hasNewUpdates = currentCount > previousCount;
    previousUpdateCountRef.current = currentCount;

    if (!hasNewUpdates) {
      prevScrollHeightRef.current = nextHeight;
      return;
    }

    // Scroll to the bottom of the live PA's pitch table (actual content, not empty space).
    const livePitches = el.querySelector(".pa-row--live .pa-row__pitches");
    if (livePitches instanceof HTMLElement) {
      const containerRect = el.getBoundingClientRect();
      const pitchesRect = livePitches.getBoundingClientRect();
      const delta = pitchesRect.bottom - containerRect.bottom;
      if (delta > 0) {
        el.scrollTop += delta;
      }
    } else {
      el.scrollTop = nextHeight;
    }
    prevScrollHeightRef.current = nextHeight;
  }, [replayUpdates]);

  useLayoutEffect((): void => {
    const newLen = completedAtBats.length;
    const prevLen = prevCompletedLengthRef.current;
    prevCompletedLengthRef.current = newLen;

    if (newLen <= prevLen || newLen === 0) return;

    const el = feedScrollRef.current;
    if (el == null) return;

    // Scroll so the newly completed PA row is at the top of the feed.
    const lastCompleted = el.querySelector(`#pa-${completedAtBats[newLen - 1].atBatIndex}`);
    if (!(lastCompleted instanceof HTMLElement)) return;

    const containerRect = el.getBoundingClientRect();
    const elemRect = lastCompleted.getBoundingClientRect();
    el.scrollTop = Math.max(0, el.scrollTop + (elemRect.top - containerRect.top));
  }, [completedAtBats]);

  useEffect((): (() => void) => {
    if (replayTimerRef.current != null) {
      window.clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }

    if (stableUpdates.length === 0) {
      return () => undefined;
    }

    const scheduleNext = (): void => {
      replayTimerRef.current = window.setTimeout((): void => {
        setReplayCount((current) => {
          if (current >= stableUpdates.length) return current;
          return current + 1;
        });
      }, getReplayDelayMs());
    };

    if (replayCount < stableUpdates.length) {
      scheduleNext();
    }

    return (): void => {
      if (replayTimerRef.current != null) {
        window.clearTimeout(replayTimerRef.current);
        replayTimerRef.current = null;
      }
    };
  }, [stableUpdates, replayCount]);

  const dateKey = useMemo(
    () => (typeof (game as any)?.gameDate === "string" ? String((game as any).gameDate).slice(0, 10) : null),
    [(game as any)?.gameDate],
  );

  const gameOverrides = useRealtimeDailyGames(dateKey);

  const gameTitle =
    game != null ? `${game.awayName} @ ${game.homeName}` : `Game ${gameId ?? "(unknown)"}`;

  return (
    <section className="game-page">
      <PageTitle
        title={gameTitle}
        subtitle={game?.gameDate ?? undefined}
        right={latest != null ? <LivePill /> : undefined}
      />

      {isLoading && <p style={{ padding: "0 28px" }}>Loading game…</p>}
      {error !== null && <p style={{ padding: "0 28px" }}>{error}</p>}
      {!isLoading && error === null && game == null && (
        <p style={{ padding: "0 28px" }}>Game not found.</p>
      )}

      {!isLoading && error === null && game != null && (
        <div className="game-page__body">
          {/* Watching strip (dormant — future multi-watch feature) */}
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
                      {ws.statusText !== "" && (
                        <span className="gwc-status">{ws.statusText}</span>
                      )}
                    </button>
                  );
                })}
            </div>
          )}

          {/* Alerts */}
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
                onClick={() => setAlertHistoryOpen(true)}
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-pill)",
                  background: "var(--color-surface)",
                  color: "var(--color-text-muted)",
                  padding: "4px 12px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Alert history
              </button>
            </div>
          )}

          <ScoreboardStrip game={game} latest={latest} />

          {(latest != null || currentAtBat != null) && (
            <PitchHero game={game} latest={latest} currentAtBat={currentAtBat} />
          )}

          <div className="game-page__grid">
            <PitchByPitch
              completedAtBats={completedAtBats}
              currentAtBat={currentAtBat}
              feedScrollRef={feedScrollRef}
            />
            <LineupCompact />
          </div>
        </div>
      )}

      {/* Connection status (dev indicator) */}
      {watchedGameIds.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 12,
            right: 16,
            fontSize: 11,
            color: isConnected ? "var(--color-positive)" : "var(--color-danger)",
            fontFamily: "var(--font-mono)",
            opacity: 0.6,
            pointerEvents: "none",
          }}
        >
          {isConnected ? "● connected" : "● disconnected"}
          {connectionError != null && ` (${connectionError})`}
        </div>
      )}

      <AlertHistoryDrawer
        gameId={gameId}
        open={alertHistoryOpen}
        onClose={() => setAlertHistoryOpen(false)}
      />
    </section>
  );
}
