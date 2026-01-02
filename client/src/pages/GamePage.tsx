// client/src/pages/GamePage.tsx
import "./DailyGamesPage.css"; // reuse scoreboard / feed styles
import type { ReactElement } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import type { GameViewDto } from "@bitslinger21/baseball-realtime-client";
import { gamesApi } from "../api/baseballApiClient";
import { useRealtimeGame } from "../realtime/useRealtimeGame";
import type { PlayUpdate } from "../realtime/types";
import { LiveScoreboard } from "./LiveScoreboard";
import { PitchByPitchFeed } from "./PitchByPitchFeed";
import { BoxScorePanel } from "./BoxScorePanel";
import type { BoxScoreDto } from "@bitslinger21/baseball-realtime-client";
import { boxScoreApi } from "../api/baseballApiClient";

export function GamePage(): ReactElement {
  const { providerGameId } = useParams();
  const gameId: string | null = providerGameId ?? null;

  const [game, setGame] = useState<GameViewDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [box, setBox] = useState<BoxScoreDto | null>(null);
  const [boxError, setBoxError] = useState<string | null>(null);
  const [boxLoading, setBoxLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const {
    plays: updates,
    alerts,
    isConnected,
    connectionError,
    activeGameId,
    isActive,
    toggleGame,
  } = useRealtimeGame(gameId);

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

        // This uses the generated method that calls:
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

  useEffect((): void => {
    const load = async (): Promise<void> => {
      if (gameId == null) return;

      try {
        setBoxLoading(true);
        setBoxError(null);

        const resp = await boxScoreApi.boxScoreGet(gameId);
        setBox(resp.data ?? null);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setBox(null);
        setBoxError("Failed to load box score.");
      } finally {
        setBoxLoading(false);
      }
    };

    void load();
  }, [gameId]);

  const hasUpdates: boolean = updates.length > 0;
  const latest: PlayUpdate | null = hasUpdates
    ? updates[updates.length - 1]
    : null;

  return (
    <section className="page-container">
      <button
        type="button"
        className="back-link"
        onClick={(): void => {
          navigate("/");
        }}
      >
        ← Back to games
      </button>

      <h2 className="page-title">
        {game != null
          ? `${game.awayName} @ ${game.homeName}`
          : `Game ${gameId ?? "(unknown)"}`}
      </h2>
      {isLoading && <p>Loading game…</p>}
      {error !== null && <p>{error}</p>}

      {!isLoading && error === null && game == null && (
        <p>Game not found.</p>
      )}

      {!isLoading && error === null && game != null && (
        <div className="games-layout">
          {/* Left: box score panel (replaces basic metadata card) */}
          <div className="game-detail">
            <div className="panel-scroll">
              {boxLoading && <p>Loading box score…</p>}
              {boxError != null && <p>{boxError}</p>}
              {!boxLoading && boxError == null && box != null && (
                <BoxScorePanel box={box} game={game} live={latest} />
              )}
              {!boxLoading && boxError == null && box == null && (
                <p>No box score data yet.</p>
              )}
            </div>
          </div>
          {/* Right: live feed with scoreboard + event log */}
          <div className="live-feed">
            {gameId != null && (
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

            {latest != null && (
              <LiveScoreboard game={game} update={latest} />
            )}

            {/* Alerts strip – same idea as DailyGamesPage */}
            {alerts.length > 0 && (
              <div className="alerts-strip">
                {alerts.slice(-3).map((a, index) => (
                  <div
                    key={`${a.at}-${index}`}
                    className="alert-chip"
                  >
                    <span className="alert-type">{a.type}</span>
                    <span className="alert-note">{a.note}</span>
                  </div>
                ))}
              </div>
            )}

            <div
              className="feed-scroll"
              ref={feedScrollRef}
              onScroll={handleFeedScroll}
              onWheel={handleFeedScroll}
              onTouchMove={handleFeedScroll}
            >
              {!hasUpdates ? (
                <p className="live-feed-message">Select a game to view. Click ▶ to watch</p>
              ) : (
                <>
                  <PitchByPitchFeed updates={updates} />
                </>
              )}
            </div>
          </div>
        </div>
      )
      }
    </section >
  );
}
