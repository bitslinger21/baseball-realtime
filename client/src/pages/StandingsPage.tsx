import "./StandingsPage.css";
import { useEffect, useState } from "react";
import type { StandingTeamDto } from "@bitslinger21/baseball-realtime-client";
import { standingsApi } from "../api/baseballApiClient";

type DivisionGroup = {
  divisionName: string;
  teams: StandingTeamDto[];
};

type LeagueBlock = {
  leagueName: string;
  divisions: DivisionGroup[];
};

function groupByLeagueAndDivision(teams: readonly StandingTeamDto[]): LeagueBlock[] {
  const leagueMap = new Map<string, Map<string, StandingTeamDto[]>>();

  for (const t of teams) {
    if (!leagueMap.has(t.leagueName)) {
      leagueMap.set(t.leagueName, new Map());
    }
    const divMap = leagueMap.get(t.leagueName)!;
    if (!divMap.has(t.divisionName)) {
      divMap.set(t.divisionName, []);
    }
    divMap.get(t.divisionName)!.push(t);
  }

  const leagueOrder = ["American League", "National League"];
  const sorted = [...leagueMap.keys()].sort(
    (a, b) => leagueOrder.indexOf(a) - leagueOrder.indexOf(b),
  );

  return sorted.map((leagueName) => {
    const divMap = leagueMap.get(leagueName)!;
    const divisions: DivisionGroup[] = [...divMap.entries()].map(([divisionName, divTeams]) => ({
      divisionName,
      teams: divTeams,
    }));
    return { leagueName, divisions };
  });
}

function TeamLogo({ team }: { team: StandingTeamDto }): React.ReactElement {
  if (team.logoUrl == null) {
    return (
      <span
        className="standings-abbr-badge"
        style={{ backgroundColor: team.primaryColorHex ?? "#555" }}
      >
        {team.abbr}
      </span>
    );
  }
  return (
    <img
      className="standings-team-logo"
      src={team.logoUrl}
      alt={team.abbr}
      loading="lazy"
    />
  );
}

function DivisionTable({ group }: { group: DivisionGroup }): React.ReactElement {
  return (
    <div className="standings-division">
      <h4 className="standings-division-name">{group.divisionName}</h4>
      <table className="standings-table">
        <thead>
          <tr>
            <th className="standings-col-team">Team</th>
            <th className="standings-col-num">W</th>
            <th className="standings-col-num">L</th>
            <th className="standings-col-num">PCT</th>
            <th className="standings-col-num">GB</th>
            <th className="standings-col-num">L10</th>
            <th className="standings-col-num">STRK</th>
          </tr>
        </thead>
        <tbody>
          {group.teams.map((t) => (
            <tr key={t.abbr}>
              <td className="standings-col-team">
                <TeamLogo team={t} />
                <span className="standings-team-name">{t.teamName}</span>
              </td>
              <td className="standings-col-num">{t.wins}</td>
              <td className="standings-col-num">{t.losses}</td>
              <td className="standings-col-num">{t.pct}</td>
              <td className="standings-col-num">{t.gamesBack}</td>
              <td className="standings-col-num">{t.lastTen}</td>
              <td className="standings-col-num standings-streak">{t.streak}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StandingsPage(): React.ReactElement {
  const [teams, setTeams] = useState<readonly StandingTeamDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect((): void => {
    const load = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await standingsApi.standingsGetStandings(String(new Date().getFullYear()));
        setTeams(res.data ?? []);
      } catch (e) {
        setError("Failed to load standings.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const leagues = groupByLeagueAndDivision(teams);

  return (
    <section className="page-container">
      <div className="page-header">
        <h2>Standings</h2>
      </div>

      {isLoading && (
        <div className="status-banner status-banner--loading">Loading standings…</div>
      )}

      {!isLoading && error != null && (
        <div className="status-banner status-banner--error">{error}</div>
      )}

      {!isLoading && error == null && teams.length === 0 && (
        <div className="status-banner status-banner--empty">No standings data available.</div>
      )}

      {!isLoading && error == null && leagues.length > 0 && (
        <div className="standings-leagues">
          {leagues.map((league) => (
            <div key={league.leagueName} className="standings-league">
              <h3 className="standings-league-name">{league.leagueName}</h3>
              {league.divisions.map((div) => (
                <DivisionTable key={div.divisionName} group={div} />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
