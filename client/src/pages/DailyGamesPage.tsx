// client/src/pages/DailyGamesPage.tsx
import "./DailyGamesPage.css";
import { useRealtimeGame } from "../realtime/useRealtimeGame";
import type { PlayUpdate } from "../realtime/types";
import type { ReactElement, CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { GameDto } from "@bitslinger21/baseball-realtime-client";
import { gamesApi } from "../api/baseballApiClient";

export default function DailyGamesPage(): ReactElement {
  const [games, setGames] = useState<readonly GameDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProviderGameId, setSelectedProviderGameId] =
    useState<string | null>(null);
  const navigate = useNavigate();

  // Hard-coded for now; you can wire this to a date picker later.
  const date: string = "2025-09-24";

  useEffect((): void => {
    const loadGames = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await gamesApi.gamesListByDate(date);

        // eslint-disable-next-line no-console
        console.log("games for", date, response.data);

        setGames(response.data ?? []);
      } catch (e) {
        setError("Failed to load games.");
        // eslint-disable-next-line no-console
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    void loadGames();
  }, [date]);

  const safeGames: readonly GameDto[] = (games ?? []).filter(
    (g: GameDto | undefined | null): g is GameDto => g != null,
  );

  const selectedGame: GameDto | null =
    safeGames.find(
      (g: GameDto): boolean =>
        g.providerGameId != null &&
        g.providerGameId === selectedProviderGameId,
    ) ?? null;

  const updates: readonly PlayUpdate[] = useRealtimeGame(
    selectedProviderGameId,
  );

  // --- HEIGHT LOCKING: match live-feed height to game list height ---

  const gameListRef = useRef<HTMLUListElement | null>(null);
  const [liveFeedHeight, setLiveFeedHeight] = useState<number | null>(null);

  // Measure game list height once games are loaded
  useEffect(() => {
    if (gameListRef.current == null) {
      return;
    }

    const id: number = window.requestAnimationFrame(() => {
      if (gameListRef.current != null) {
        const listHeight: number = gameListRef.current.offsetHeight;

        // Adjust for live-feed padding + border so outer boxes match
        const padAndBorder: number = 34; // 16+16 padding + 1+1 border
        const adjusted: number = Math.max(listHeight - padAndBorder, 0);

        setLiveFeedHeight(adjusted);
      }
    });

    return () => {
      window.cancelAnimationFrame(id);
    };
  }, [safeGames.length]);

  // Optional: re-measure on window resize
  useEffect(() => {
    const handleResize = (): void => {
      if (gameListRef.current == null) {
        return;
      }
      const listHeight: number = gameListRef.current.offsetHeight;

      const padAndBorder: number = 34;
      const adjusted: number = Math.max(listHeight - padAndBorder, 0);

      setLiveFeedHeight(adjusted);
    };

    window.addEventListener("resize", handleResize);
    return (): void => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const liveFeedStyle: CSSProperties =
    liveFeedHeight != null ? { height: liveFeedHeight } : {};

  // --- SCROLLING: only scroll inside the live feed list ---

  const feedScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = feedScrollRef.current;
    if (el == null) {
      return;
    }
    el.scrollTop = el.scrollHeight;
  }, [updates]);

  return (
    <section className="page-container">
      <h2>Games for {date}</h2>

      {isLoading && <p>Loading…</p>}
      {error !== null && <p>{error}</p>}

      {!isLoading && error === null && safeGames.length === 0 && (
        <p>No games returned.</p>
      )}

      {!isLoading && error === null && safeGames.length > 0 && (
        <div className="games-layout">
          {/* Left: game list */}
          <ul className="game-list" ref={gameListRef}>
            {safeGames.map((g: GameDto): ReactElement => {
              const isSelected: boolean =
                g.providerGameId != null &&
                g.providerGameId === selectedProviderGameId;

              return (
                <li
                  key={g.providerGameId}
                  className={`game-card ${isSelected ? "selected" : ""}`}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {g.awayAbbr} @ {g.homeAbbr}{" "}
                      <span style={{ opacity: 0.7 }}>({g.status})</span>
                    </div>
                    <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                      {g.gameDate}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`join-btn ${isSelected ? "selected" : ""}`}
                    onClick={(): void =>
                      setSelectedProviderGameId(g.providerGameId ?? null)
                    }
                  >
                    {isSelected ? "Listening…" : "Join live"}
                  </button>
                  <button
                    type="button"
                    className="join-btn"
                    onClick={(): void => {
                      if (g.providerGameId != null) {
                        navigate(`/game/${g.providerGameId}`);
                      }
                    }}
                    style={{ marginLeft: "0.5rem" }}
                  >
                    Open game page
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Right: live feed */}
          <div className="live-feed" style={liveFeedStyle}>
            <h3>Live feed</h3>

            {selectedProviderGameId == null && (
              <p className="live-feed-message">
                Select a game to join live.
              </p>
            )}

            {selectedProviderGameId != null && selectedGame == null && (
              <p className="live-feed-message">
                Selected game not found in list. (This would be unusual.)
              </p>
            )}

            {selectedProviderGameId != null && selectedGame != null && (
              <>
                <p className="live-feed-message">
                  Listening to{" "}
                  <strong>
                    {selectedGame.awayAbbr} @ {selectedGame.homeAbbr}
                  </strong>{" "}
                  — status: <em>{selectedGame.status}</em>
                </p>

                {/* Mini scoreboard */}
                {updates.length > 0 && (
                  <div className="scoreboard">
                    <div className="sb-row">
                      <span className="sb-team">
                        {selectedGame.awayAbbr}
                      </span>
                      <span className="sb-score">
                        {updates[updates.length - 1].awayScore}
                      </span>

                      <span className="sb-team">
                        {selectedGame.homeAbbr}
                      </span>
                      <span className="sb-score">
                        {updates[updates.length - 1].homeScore}
                      </span>
                    </div>

                    <div className="sb-row sb-info">
                      <span>
                        {updates[updates.length - 1].half}{" "}
                        {updates[updates.length - 1].inning}
                      </span>
                      <span>
                        {updates[updates.length - 1].outs} out
                        {updates[updates.length - 1].outs === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="sb-bases">
                      <span
                        className={
                          updates[updates.length - 1].bases.on1
                            ? "base active"
                            : "base"
                        }
                      />
                      <span
                        className={
                          updates[updates.length - 1].bases.on2
                            ? "base active"
                            : "base"
                        }
                      />
                      <span
                        className={
                          updates[updates.length - 1].bases.on3
                            ? "base active"
                            : "base"
                        }
                      />
                    </div>
                  </div>
                )}

                {updates.length === 0 && (
                  <p className="live-feed-message">No updates yet…</p>
                )}

                <div className="feed-scroll" ref={feedScrollRef}>
                  <ul className="live-feed-list">
                    {updates.map(
                      (
                        u: PlayUpdate,
                        index: number,
                      ): ReactElement => (
                        <li key={`${u.ts}-${index}`}>
                          [{u.inning} {u.half}]{" "}
                          {u.awayScore}–{u.homeScore} —{" "}
                          {u.batterName ?? "Batter"} vs{" "}
                          {u.pitcherName ?? "Pitcher"} —{" "}
                          {u.balls}-{u.strikes}, {u.outs} out
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
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
