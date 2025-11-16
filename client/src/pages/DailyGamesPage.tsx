// client/src/DailyGamesPage.tsx
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import type { GameDto } from "@bitslinger21/baseball-realtime-client";
import { gamesApi } from "../api/baseballApiClient";

export default function DailyGamesPage(): ReactElement {
  const [games, setGames] = useState<readonly GameDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Hard-coded for now; you can wire this to a date picker later.
  const date: string = "2025-09-24";

  useEffect(() => {
    const loadGames = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        // Adjust method name to whatever the generator created.
        // With operationId: Games_listByDate, typescript-axios usually
        // generates something like `gamesListByDate`.
        const response = await (gamesApi as unknown as {
          gamesListByDate: (params: { date: string }) => Promise<{ data: GameDto[] }>;
        }).gamesListByDate({ date });

        // Optional: sanity log so you can see the shape
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

  return (
    <section style={{ padding: "1rem" }}>
      <h2>Games for {date}</h2>

      {isLoading && <p>Loading…</p>}
      {error !== null && <p>{error}</p>}

      {!isLoading && error === null && safeGames.length === 0 && (
        <p>No games returned.</p>
      )}

      {!isLoading && error === null && safeGames.length > 0 && (
        <ul>
          {safeGames.map((g: GameDto): ReactElement => (
            <li key={g.id ?? g.providerGameId}>
              {/* ✅ Use flat fields from GameDto */}
              {g.awayAbbr} @ {g.homeAbbr}{" "}
              <span style={{ opacity: 0.7 }}>({g.status})</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}