// client/src/pages/GamePage.tsx
import "./DailyGamesPage.css"; // reuse scoreboard / feed styles
import type { ReactElement } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAtBatHistory } from "../hooks/useAtBatHistory";
import { AtBatBlock } from "../components/AtBatCard/AtBatBlock";
import { useNavigate, useParams } from "react-router-dom";

import type { GameViewDto } from "@bitslinger21/baseball-realtime-client";
import { gamesApi } from "../api/baseballApiClient";
import { useRealtimeGame } from "../realtime/useRealtimeGame";
import type { PlayUpdate } from "../realtime/types";
import { LiveScoreboard } from "./LiveScoreboard";

import { BoxScorePanel } from "./BoxScorePanel";
import type { BoxScoreDto } from "@bitslinger21/baseball-realtime-client";
import { boxScoreApi } from "../api/baseballApiClient";
import { GameTimeline } from "../components/GameTimeline";
import { JumpToBottomButton } from "../components/JumpToBottomButton";
import { getReplayDelayMs } from "../utils/replayDelay";
import { AlertHistoryDrawer } from "./AlertHistoryDrawer";
import { useRealtimeDailyGames } from "../realtime/useRealtimeDailyGames";

export function GamePage(): ReactElement {
  const { providerGameId } = useParams();
  const gameId: string | null = providerGameId ?? null;
  const navigate = useNavigate();

  const [game, setGame] = useState<GameViewDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [box, setBox] = useState<BoxScoreDto | null>(null);
  const [boxError, setBoxError] = useState<string | null>(null);
  const [boxLoading, setBoxLoading] = useState<boolean>(false);
  const [replayCount, setReplayCount] = useState<number>(0);
  const replayTimerRef = useRef<number | null>(null);
  const [alertHistoryOpen, setAlertHistoryOpen] = useState(false);
  const [expandedAtBats, setExpandedAtBats] = useState<ReadonlySet<number>>(
    () => new Set(),
  );

  const boxColumnRef = useRef<HTMLDivElement | null>(null);
  const [liveFeedHeightPx, setLiveFeedHeightPx] = useState<number | null>(null);

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

  const feedScrollRef = useRef<HTMLDivElement | null>(null);
  const liveFeedFrameRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);
  const prevScrollHeightRef = useRef<number>(0);

  function isNearBottom(el: HTMLDivElement, thresholdPx = 48): boolean {
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom <= thresholdPx;
  }

  function handleFeedScroll(): void {
    const el = feedScrollRef.current;
    if (el == null) return;

    shouldAutoScrollRef.current = isNearBottom(el);
    prevScrollHeightRef.current = el.scrollHeight;
  }

  function resolveTimelineTargetElement(targetId: string): {
    container: HTMLDivElement;
    list: HTMLElement;
    target: HTMLElement;
  } | null {
    const container = feedScrollRef.current;
    if (container == null) return null;

    const list = container.querySelector(".live-feed-list");
    if (!(list instanceof HTMLElement)) return null;

    const target = list.querySelector<HTMLElement>(`#${CSS.escape(targetId)}`);
    if (target == null) return null;

    return { container, list, target };
  }

  function getScrollTopForTarget(container: HTMLElement, target: HTMLElement): number {
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    return Math.max(0, container.scrollTop + (targetRect.top - containerRect.top));
  }

  useEffect((): void => {
    shouldAutoScrollRef.current = true;
    prevScrollHeightRef.current = 0;
    hasHydratedFeedRef.current = false;
    previousUpdateCountRef.current = 0;
    setReplayCount(0);
    setExpandedAtBats(new Set());

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

  const replayUpdates: readonly PlayUpdate[] = useMemo(() => {
    return stableUpdates.slice(0, replayCount);
  }, [stableUpdates, replayCount]);

  const hasUpdates: boolean = replayUpdates.length > 0;
  const latest: PlayUpdate | null = hasUpdates ? replayUpdates[replayUpdates.length - 1] : null;

  const { currentAtBat, completedAtBats } = useAtBatHistory(latest);

  function toggleAtBat(atBatIndex: number): void {
    setExpandedAtBats((prev) => {
      const next = new Set(prev);
      if (next.has(atBatIndex)) next.delete(atBatIndex);
      else next.add(atBatIndex);
      return next;
    });
  }


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

    el.scrollTop = nextHeight;
    prevScrollHeightRef.current = nextHeight;
  }, [replayUpdates]);


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
          if (current >= stableUpdates.length) {
            return current;
          }
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

  const isLiveFromRealtime: boolean =
    latest != null && typeof (latest as any).inning === "number";

  const isFinalFromRealtime: boolean =
    latest != null && ((latest as any).isFinal === true || (latest as any).status === "final");

  useEffect((): () => void => {
    let isCancelled = false;
    let timer: number | null = null;

    const fetchOnce = async (): Promise<void> => {
      if (gameId == null) return;

      try {
        setBoxLoading(true);
        setBoxError(null);

        const resp = await boxScoreApi.boxScoreGet(gameId);
        if (!isCancelled) setBox(resp.data ?? null);
      } catch (e) {
        console.error(e);
        if (!isCancelled) {
          setBoxError("Failed to load box score.");
        }
      } finally {
        if (!isCancelled) setBoxLoading(false);
      }
    };

    const scheduleNext = (ms: number): void => {
      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void tick();
      }, ms);
    };

    const tick = async (): Promise<void> => {
      await fetchOnce();

      const isLiveNow: boolean = isLiveFromRealtime || game?.status === "live";
      const isFinalNow: boolean = isFinalFromRealtime || game?.status === "final";

      if (!isCancelled && isLiveNow && !isFinalNow) {
        scheduleNext(10_000);
      }
    };

    void tick();

    return () => {
      isCancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [gameId, game?.status, isLiveFromRealtime, isFinalFromRealtime]);

  useLayoutEffect((): (() => void) | void => {
    const el = boxColumnRef.current;
    if (el == null) return;

    const updateHeight = (): void => {
      const rect = el.getBoundingClientRect();
      const viewportBottomPadding = 16;
      const nextHeight = Math.max(
        420,
        Math.floor(window.innerHeight - rect.top - viewportBottomPadding),
      );

      if (nextHeight > 0) {
        setLiveFeedHeightPx(nextHeight);
      }
    };

    updateHeight();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        updateHeight();
      });
      observer.observe(el);
      window.addEventListener("resize", updateHeight);
      return () => {
        observer.disconnect();
        window.removeEventListener("resize", updateHeight);
      };
    }

    window.addEventListener("resize", updateHeight);
    return () => {
      window.removeEventListener("resize", updateHeight);
    };
  }, [gameId]);

  return (
    <section className="page-container">
      <div className="page-header">
        <h2 className="page-title">
          {game != null ? `${game.awayName} @ ${game.homeName}` : `Game ${gameId ?? "(unknown)"}`}
        </h2>
      </div>

      {isLoading && <p>Loading game…</p>}
      {error !== null && <p>{error}</p>}

      {!isLoading && error === null && game == null && <p>Game not found.</p>}

      {!isLoading && error === null && game != null && (
        <div className="games-layout">
          <div
            className="game-detail"
            ref={boxColumnRef}
            style={{
              minHeight: liveFeedHeightPx != null ? `${liveFeedHeightPx}px` : 0,
              height: liveFeedHeightPx != null ? `${liveFeedHeightPx}px` : undefined,
              maxHeight: liveFeedHeightPx != null ? `${liveFeedHeightPx}px` : undefined,
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            <div className="panel-scroll">
              {boxError != null && box == null && <p>{boxError}</p>}
              {boxLoading && box == null && <p>Loading box score…</p>}
              {boxLoading && box != null && (
                <p style={{ marginBottom: "0.5rem", opacity: 0.7, fontSize: "0.85rem" }}>
                  Refreshing box score…
                </p>
              )}
              {box != null && <BoxScorePanel box={box} game={game} live={latest} />}
              {!boxLoading && boxError == null && box == null && <p>No box score data yet.</p>}
            </div>
          </div>

          <div
            className="live-feed"
            style={{
              minHeight: 0,
              display: "flex",
              height: liveFeedHeightPx != null ? `${liveFeedHeightPx}px` : undefined,
              maxHeight: liveFeedHeightPx != null ? `${liveFeedHeightPx}px` : undefined,
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            <div
              ref={liveFeedFrameRef}
              className="live-feed-frame"
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div className="live-feed-fixed">
                {watchedGameIds.length > 0 && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      marginBottom: "0.25rem",
                      color: isConnected ? "green" : "red",
                      opacity: "0.8",
                      textAlign: "right",
                      alignSelf: "flex-end",
                      width: "100%",
                    }}
                  >
                    {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
                    {connectionError != null && (
                      <span style={{ marginLeft: "0.5rem", color: "orange" }}>
                        (error: {connectionError})
                      </span>
                    )}
                  </div>
                )}

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

                <h3 style={{ marginTop: 0 }}>Live feed</h3>

                {latest != null && <LiveScoreboard game={game} update={latest} />}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                  {alerts.length > 0 && (
                    <div className="alerts-strip" style={{ flex: 1 }}>
                      {alerts.slice(-3).map((a, index) => (
                        <div key={`${a.at}-${index}`} className="alert-chip">
                          <span className="alert-type">{a.type}</span>
                          <span className="alert-note">{a.note}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(): void => setAlertHistoryOpen(true)}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 999,
                      background: "#fff",
                      color: "#374151",
                      padding: "0.28rem 0.65rem",
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    Alert History
                  </button>
                </div>

                <GameTimeline
                  updates={replayUpdates}
                  onJump={(targetId) => {
                    const resolved = resolveTimelineTargetElement(targetId);

                    if (resolved == null) {
                      return;
                    }

                    const { container, target } = resolved;
                    shouldAutoScrollRef.current = false;

                    const nextTop = getScrollTopForTarget(container, target);

                    container.scrollTop = nextTop;
                  }}
                />
              </div>

              <div className="live-feed-body">
                <div className="feed-panel">
                  <div
                    className="feed-scroll"
                    ref={feedScrollRef}
                    onScroll={handleFeedScroll}
                    onWheel={handleFeedScroll}
                    onTouchMove={handleFeedScroll}
                  >
                    {!hasUpdates ? (
                      <p className="live-feed-message">Waiting for updates…</p>
                    ) : (
                      <ul className="live-feed-list">
                        {completedAtBats.map((atBat) => (
                          <AtBatBlock
                            key={atBat.atBatIndex}
                            atBat={atBat}
                            isActive={false}
                            isExpanded={expandedAtBats.has(atBat.atBatIndex)}
                            onToggle={() => toggleAtBat(atBat.atBatIndex)}
                          />
                        ))}
                        {currentAtBat != null && (
                          <AtBatBlock
                            key={currentAtBat.atBatIndex}
                            atBat={currentAtBat}
                            isActive={true}
                          />
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              <JumpToBottomButton containerRef={feedScrollRef} anchorRef={liveFeedFrameRef} />
            </div>
          </div>

        </div>
      )
      }
      <AlertHistoryDrawer
        gameId={gameId}
        open={alertHistoryOpen}
        onClose={(): void => setAlertHistoryOpen(false)}
      />
    </section >
  );
}