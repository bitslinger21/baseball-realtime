// client/src/pages/GamePage.tsx
import "./DailyGamesPage.css"; // reuse scoreboard / feed styles
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import type { GameDto } from "@bitslinger21/baseball-realtime-client";
import { gamesApi } from "../api/baseballApiClient";
import { useRealtimeGame } from "../realtime/useRealtimeGame";
import type { PlayUpdate } from "../realtime/types";

export function GamePage(): ReactElement {
  const { providerGameId } = useParams();
  const gameId: string | null = providerGameId ?? null;

  const [game, setGame] = useState<GameDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
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
          {/* Left: basic game info / metadata */}
          <div className="game-detail">
            <h3 className="game-detail-title">
              {game.awayAbbr} @ {game.homeAbbr}
            </h3>
            <p className="game-detail-meta">
              Status: <strong>{game.status}</strong>
            </p>
            <p className="game-detail-meta">Date: {game.gameDate}</p>
          </div>

          {/* Right: live feed with scoreboard + event log */}
          <div className="live-feed live-feed--fixed">
            <h3>Live feed</h3>
            {gameId != null && (
              <div
                style={{
                  fontSize: "0.75rem",
                  marginBottom: "0.25rem",
                  color: isConnected ? "green" : "red",
                  opacity: 0.8,
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

            {latest != null && (
              <div className="scoreboard">
                <div className="sb-row">
                  <span className="sb-team">{game.awayAbbr}</span>
                  <span className="sb-score">{latest.awayScore}</span>

                  <span className="sb-team">{game.homeAbbr}</span>
                  <span className="sb-score">{latest.homeScore}</span>
                </div>

                <div className="sb-row sb-info">
                  <span>
                    {latest.half} {latest.inning}
                  </span>
                  <span>
                    {latest.outs} out
                    {latest.outs === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="sb-bases">
                  <span
                    className={
                      latest.bases.on1 ? "base active" : "base"
                    }
                  />
                  <span
                    className={
                      latest.bases.on2 ? "base active" : "base"
                    }
                  />
                  <span
                    className={
                      latest.bases.on3 ? "base active" : "base"
                    }
                  />
                </div>
              </div>
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
                <ul className="live-feed-list">
                  {updates.map(
                    (u: PlayUpdate, index: number): ReactElement => (
                      <li
                        key={`${u.ts}-${index}`}
                        className={
                          index === updates.length - 1
                            ? "latest-play"
                            : undefined
                        }
                      >
                        [{u.inning} {u.half}] {u.awayScore}–{u.homeScore} —{" "}
                        {u.batterName ?? "Batter"} vs{" "}
                        {u.pitcherName ?? "Pitcher"} — {u.balls}-{u.strikes},{" "}
                        {u.outs} out
                        {u.outs === 1 ? "" : "s"}
                        {u.description != null &&
                          u.description.trim() !== "" && (
                            <> — {u.description}</>
                          )}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
