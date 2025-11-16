// client/src/pages/DailyGamesPage.tsx
import "./DailyGamesPage.css";
import { useRealtimeGame } from "../realtime/useRealtimeGame";
import type { PlayUpdate } from "../realtime/types";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import type { GameDto } from "@bitslinger21/baseball-realtime-client";
import { gamesApi } from "../api/baseballApiClient";

export default function DailyGamesPage(): ReactElement {
  const [games, setGames] = useState<readonly GameDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProviderGameId, setSelectedProviderGameId] = useState<string | null>(null);

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
        g.providerGameId != null && g.providerGameId === selectedProviderGameId,
    ) ?? null;

  const updates: readonly PlayUpdate[] = useRealtimeGame(selectedProviderGameId);

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
          <ul className="game-list">
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
                </li>
              );
            })}
          </ul>

          {/* Right: live feed */}
          <div className="live-feed">
            <h3>Live feed</h3>

            {selectedProviderGameId == null && (
              <p style={{ opacity: 0.8 }}>Select a game to join live.</p>
            )}

            {selectedProviderGameId != null && selectedGame == null && (
              <p style={{ opacity: 0.8 }}>
                Selected game not found in list. (This would be unusual.)
              </p>
            )}

            {selectedProviderGameId != null && selectedGame != null && (
              <>
                <p>
                  Listening to{" "}
                  <strong>
                    {selectedGame.awayAbbr} @ {selectedGame.homeAbbr}
                  </strong>{" "}
                  — status: <em>{selectedGame.status}</em>
                </p>

                {updates.length === 0 && (
                  <p style={{ opacity: 0.8 }}>No updates yet…</p>
                )}

                {updates.length > 0 && (
                  <ul style={{ paddingLeft: "1.2rem", marginTop: "0.5rem" }}>
                    {updates.map((u: PlayUpdate, index: number): ReactElement => (
                      <li key={`${u.ts}-${index}`}>
                        [{u.inning} {u.half}] {u.description} — {""}
                        {u.awayScore}–{u.homeScore}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}