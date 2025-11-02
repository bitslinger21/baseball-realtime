import { useMemo, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { useDailyGames } from "../hooks/useDailyGames";
import { useSearchParams } from "react-router-dom";
import type { GameSummary } from "../types";


function Section({ title, items }: { title: string; items: GameSummary[] }) {
  if (!items.length) return null;
  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <ul className="divide-y">
        {items.map((g) => (
          <li key={g.gamePk} className="py-3 flex justify-between">
            <Link to={`/games/${g.gamePk}`} className="hover:underline">
              {g.away.abbr} @ {g.home.abbr}
            </Link>
            <span className="text-sm opacity-80">
              {g.status === "final" &&
                `${g.score?.away}-${g.score?.home}`}
              {g.status === "inProgress" &&
                `${g.score?.away}-${g.score?.home} • ${g.score?.half}${g.score?.inning}`}
              {g.status === "scheduled" &&
                new Date(g.startISO).toLocaleTimeString()}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DailyGamesPage(): ReactElement {
  const [params] = useSearchParams();
  const gameDate = params.get("date") ?? new Date().toISOString().slice(0, 10);
  const { loading, games } = useDailyGames(gameDate);
  
  const groups = useMemo(() => ({
    live: games.filter((g) => g.status === "inProgress"),
    final: games.filter((g) => g.status === "final"),
    scheduled: games.filter((g) => g.status === "scheduled"),
  }), [games]);

  if (loading) return <div className="p-4">Loading…</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Games — {gameDate}</h1>
      <Section title="In Progress" items={groups.live} />
      <Section title="Final" items={groups.final} />
      <Section title="Scheduled" items={groups.scheduled} />
    </div>
  );
}