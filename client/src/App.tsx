// /client/src/App.tsx
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import AppRoutes from "./AppRoutes";
import { gamesApi } from "./api/baseballApiClient";

interface Game {
  providerGameId: string;
  awayAbbr: string;
  homeAbbr: string;
  status: string;
}

export default function App(): ReactElement {
  const [games, setGames] = useState<readonly Game[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // For now, just hard-code a date so we can prove out the plumbing.
  const date: string = "2025-09-24";

  useEffect(() => {
    const loadGames = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        // Adjust method name if your generated client uses a different one
        const response = await gamesApi.gamesListByDate( date );

        // Cast to the minimal shape we care about right now
        setGames(response.data as readonly Game[]);
      } catch (err) {
        setError("Failed to load games.");
        // eslint-disable-next-line no-console
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    void loadGames();
  }, [date]);

  return (
    <>
      <AppRoutes />

      {/* Temporary debug block so we can see the API call working */}
      <section style={{ padding: "1rem" }}>
        <h2>Debug: games for {date}</h2>
        {isLoading && <p>Loading…</p>}
        {error !== null && <p>{error}</p>}
        {!isLoading && error === null && games.length === 0 && (
          <p>No games returned.</p>
        )}
        {!isLoading && error === null && games.length > 0 && (
          <ul>
            {games.map((g: Game) => (
              <li key={g.providerGameId}>
                {g.awayAbbr} @ {g.homeAbbr} ({g.status})
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}