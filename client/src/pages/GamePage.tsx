// client/src/pages/GamePage.tsx
import "./DailyGamesPage.css"; // reuse scoreboard / feed styles
import type { ReactElement } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import type { GameViewDto } from "@bitslinger21/baseball-realtime-client";
import { gamesApi } from "../api/baseballApiClient";
import { useRealtimeGame } from "../realtime/useRealtimeGame";
import type { PlayUpdate } from "../realtime/types";
import { LiveScoreboard } from "./LiveScoreboard";
import { PitchByPitchFeed } from "./PitchByPitchFeed";
import { BoxScorePanel } from "./BoxScorePanel";
import type { BoxScoreDto } from "@bitslinger21/baseball-realtime-client";
import { boxScoreApi } from "../api/baseballApiClient";
import { GameTimeline } from "../components/GameTimeline";

export function GamePage(): ReactElement {
  const { providerGameId } = useParams();
  const gameId: string | null = providerGameId ?? null;

  const [game, setGame] = useState<GameViewDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [box, setBox] = useState<BoxScoreDto | null>(null);
  const [boxError, setBoxError] = useState<string | null>(null);
  const [boxLoading, setBoxLoading] = useState<boolean>(false);

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

  // Keep latest functions in refs so our effects can depend only on gameId
  const toggleGameRef = useRef<(id: string) => void>(toggleGame);
  const isActiveRef = useRef<(id: string) => boolean>(isActive);
  const startedWatchingHereRef = useRef<boolean>(false);

  useEffect(() => {
    toggleGameRef.current = toggleGame;
    isActiveRef.current = isActive;
  }, [toggleGame, isActive]);

  // Auto-watch this game while this page is mounted
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
      // Only auto-stop if we were the one who started it
      if (startedWatchingHereRef.current && gameId != null) {
        const stillActive = isActiveRef.current(gameId);
        if (stillActive) {
          toggleGameRef.current(gameId);
        }
      }
      startedWatchingHereRef.current = false;
    };
  }, [gameId]);

  // --- Fetch game details from /games/providerId/:id ---
  useEffect((): void => {
    const load = async (): Promise<void> => {
      if (gameId == null) {
        setError("No game id provided in URL.");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // GET /games/providerId/{id}
        const response = await gamesApi.gamesFindByProviderId(gameId);
        setGame(response.data ?? null);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setError("Failed to load game details.");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [gameId]);

  // --- Live feed scrolling (prepend mode: newest at top) ---
  const feedScrollRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);
  const prevScrollHeightRef = useRef<number>(0);

  function isNearTop(el: HTMLDivElement, thresholdPx = 48): boolean {
    return el.scrollTop <= thresholdPx;
  }

  function handleFeedScroll(): void {
    const el = feedScrollRef.current;
    if (el == null) return;

    shouldAutoScrollRef.current = isNearTop(el);
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
    // When switching games, reset “follow newest” mode
    shouldAutoScrollRef.current = true;
    prevScrollHeightRef.current = 0;
  }, [gameId]);

  useLayoutEffect((): void => {
    const el = feedScrollRef.current;
    if (el == null) return;

    const prevHeight = prevScrollHeightRef.current;
    const nextHeight = el.scrollHeight;

    if (shouldAutoScrollRef.current) {
      // Follow newest (top) always
      el.scrollTop = 0;
    } else if (prevHeight > 0) {
      // Preserve what the user is looking at while we prepend new rows
      const delta = nextHeight - prevHeight;
      if (delta !== 0) el.scrollTop += delta;
    }

    prevScrollHeightRef.current = nextHeight;
  }, [updates]);

  const hasUpdates: boolean = updates.length > 0;
  const latest: PlayUpdate | null = hasUpdates ? updates[updates.length - 1] : null;

  // Stable reference for timeline/feed consumers (avoid accidental rebuild churn)
  const stableUpdates: readonly PlayUpdate[] = useMemo(() => updates, [updates]);

  // Determine live/final from realtime if possible (game.status might be stale)
  const isLiveFromRealtime: boolean =
    latest != null && typeof (latest as any).inning === "number";

  const isFinalFromRealtime: boolean =
    latest != null && ((latest as any).isFinal === true || (latest as any).status === "final");

  // --- Live box score polling while game is live ---
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
          setBox(null);
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

      // Prefer realtime-driven “is live” to avoid stale game.status
      const isLiveNow: boolean = isLiveFromRealtime || game?.status === "live";
      const isFinalNow: boolean = isFinalFromRealtime || game?.status === "final";

      if (!isCancelled && isLiveNow && !isFinalNow) {
        scheduleNext(10_000); // 10s
      }
    };

    void tick();

    return () => {
      isCancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [gameId, game?.status, isLiveFromRealtime, isFinalFromRealtime]);

  // --- Synchronize live-feed column height to box score column ---
  useLayoutEffect((): (() => void) | void => {
    const el = boxColumnRef.current;
    if (el == null) {
      setLiveFeedHeightPx(null);
      return;
    }

    const updateHeight = (): void => {
      const nextHeight = Math.ceil(el.getBoundingClientRect().height);
      setLiveFeedHeightPx((prev) => {
        if (prev === nextHeight) return prev;
        return nextHeight > 0 ? nextHeight : null;
      });
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
  }, [gameId, boxLoading, boxError, box, latest, alerts.length, stableUpdates.length]);

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
        <div className="games-layout" style={{ alignItems: "start" }}>
          {/* Left: box score panel */}
          <div className="game-detail" ref={boxColumnRef} style={{ minHeight: 0 }}>
            <div className="panel-scroll">
              {boxLoading && <p>Loading box score…</p>}
              {boxError != null && <p>{boxError}</p>}
              {!boxLoading && boxError == null && box != null && (
                <BoxScorePanel box={box} game={game} live={latest} />
              )}
              {!boxLoading && boxError == null && box == null && <p>No box score data yet.</p>}
            </div>
          </div>

          {/* Right: live feed */}
          <div
            className="live-feed"
            style={{
              minHeight: 0,
              display: "flex",
              height: liveFeedHeightPx != null ? `${liveFeedHeightPx}px` : undefined,
              maxHeight: liveFeedHeightPx != null ? `${liveFeedHeightPx}px` : undefined,
            }}
          >
            <div
              className="live-feed-frame"
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
                height: liveFeedHeightPx != null ? `${liveFeedHeightPx}px` : "100%",
                overflow: "hidden",
              }}
            >
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

              <h3 style={{ marginTop: 0 }}>Live feed</h3>

              {latest != null && <LiveScoreboard game={game} update={latest} />}

              {alerts.length > 0 && (
                <div className="alerts-strip">
                  {alerts.slice(-3).map((a, index) => (
                    <div key={`${a.at}-${index}`} className="alert-chip">
                      <span className="alert-type">{a.type}</span>
                      <span className="alert-note">{a.note}</span>
                    </div>
                  ))}
                </div>
              )}

              <GameTimeline
                updates={stableUpdates}
                onJump={(targetId) => {
                  const resolved = resolveTimelineTargetElement(targetId);
                  console.log(`Timeline jump to target - ${targetId} - resolved:`, resolved);

                  if (resolved == null) {
                    console.log("Timeline jump aborted: target not found", { targetId });
                    return;
                  }

                  const { container, list, target } = resolved;
                  shouldAutoScrollRef.current = false;

                  const nextTop = getScrollTopForTarget(container, target);
                  const beforeScrollTop = container.scrollTop;
                  const maxScrollTop = container.scrollHeight - container.clientHeight;
                  const targetRect = target.getBoundingClientRect();
                  const containerRect = container.getBoundingClientRect();
                  const listRect = list.getBoundingClientRect();

                  console.log("Timeline jump before scroll", {
                    targetId,
                    beforeScrollTop,
                    nextTop,
                    maxScrollTop,
                    clientHeight: container.clientHeight,
                    scrollHeight: container.scrollHeight,
                    overflowY: window.getComputedStyle(container).overflowY,
                    targetOffsetTop: target.offsetTop,
                    listOffsetTop: list.offsetTop,
                    targetRectTop: targetRect.top,
                    containerRectTop: containerRect.top,
                    listRectTop: listRect.top,
                    targetText: target.textContent,
                  });

                  container.scrollTop = nextTop;

                  requestAnimationFrame(() => {
                    console.log("Timeline jump after scroll", {
                      targetId,
                      afterScrollTop: container.scrollTop,
                      expectedScrollTop: nextTop,
                    });
                  });
                }}
              />

              <div
                className="feed-scroll"
                ref={feedScrollRef}
                onScroll={handleFeedScroll}
                onWheel={handleFeedScroll}
                onTouchMove={handleFeedScroll}
                style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}
              >
                {!hasUpdates ? (
                  <p className="live-feed-message">Waiting for updates…</p>
                ) : (
                  <PitchByPitchFeed updates={stableUpdates} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
