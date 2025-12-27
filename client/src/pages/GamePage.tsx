// client/src/pages/GamePage.tsx
import "./DailyGamesPage.css"; // reuse scoreboard / feed styles
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import type { GameDto } from "@bitslinger21/baseball-realtime-client";
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

  const [game, setGame] = useState<GameDto | null>(null);
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

  // --- Scroll the live feed list to bottom when new updates arrive ---
  const feedScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = feedScrollRef.current;
    if (el == null) {
      return;
    }
    el.scrollTop = el.scrollHeight;
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
                <BoxScorePanel box={box} />
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

            {!hasUpdates && (
              <p className="live-feed-message">No updates yet…</p>
            )}

            {hasUpdates && (
              <div className="feed-scroll" ref={feedScrollRef}>
                <PitchByPitchFeed updates={updates} />
              </div>
            )}
          </div>
        </div>
      )
      }
    </section >
  );
}
