import "./StandingsPage.css";
import { useEffect, useState } from "react";
import type { StandingTeamDto } from "@bitslinger21/baseball-realtime-client";
import { standingsApi } from "../api/baseballApiClient";
import { Segmented } from "../components/primitives/Segmented";

// ── Helpers ──────────────────────────────────────────────────

function byRecord(a: StandingTeamDto, b: StandingTeamDto): number {
  return b.wins / (b.wins + b.losses) - a.wins / (a.wins + a.losses);
}

const DIV_ORDER = ["East", "Central", "West"];

type DivisionData = { divisionName: string; teams: StandingTeamDto[] };
type LeagueData   = { leagueName: string; abbr: string; divisions: DivisionData[] };

function groupByLeague(teams: readonly StandingTeamDto[]): LeagueData[] {
  const lgMap = new Map<string, Map<string, StandingTeamDto[]>>();
  for (const t of teams) {
    if (!lgMap.has(t.leagueName)) lgMap.set(t.leagueName, new Map());
    const divMap = lgMap.get(t.leagueName)!;
    if (!divMap.has(t.divisionName)) divMap.set(t.divisionName, []);
    divMap.get(t.divisionName)!.push(t);
  }
  const lgOrder = ["American League", "National League"];
  return [...lgMap.keys()]
    .sort((a, b) => lgOrder.indexOf(a) - lgOrder.indexOf(b))
    .map((leagueName) => {
      const divMap = lgMap.get(leagueName)!;
      const abbr = leagueName === "American League" ? "AL" : "NL";
      const divisions = [...divMap.entries()]
        .map(([divisionName, ts]) => ({ divisionName, teams: [...ts].sort(byRecord) }))
        .sort((a, b) => {
          const ai = DIV_ORDER.findIndex((s) => a.divisionName.includes(s));
          const bi = DIV_ORDER.findIndex((s) => b.divisionName.includes(s));
          return ai - bi;
        });
      return { leagueName, abbr, divisions };
    });
}

type WildCardData = {
  leaders: StandingTeamDto[];
  wildcard: StandingTeamDto[];
  below: StandingTeamDto[];
  cutoff: StandingTeamDto | null;
};

function buildWildCard(league: LeagueData): WildCardData {
  const leaders = league.divisions.map((d) => d.teams[0]).filter(Boolean).sort(byRecord);
  const leaderAbbrs = new Set(leaders.map((t) => t.abbr));
  const rest = league.divisions
    .flatMap((d) => d.teams)
    .filter((t) => !leaderAbbrs.has(t.abbr))
    .sort(byRecord);
  return {
    leaders,
    wildcard: rest.slice(0, 3),
    below: rest.slice(3),
    cutoff: rest[2] ?? null,
  };
}

function wcgbStr(x: StandingTeamDto, cutoff: StandingTeamDto): string {
  if (x.abbr === cutoff.abbr) return "–";
  const d = ((x.wins - cutoff.wins) + (cutoff.losses - x.losses)) / 2;
  if (d > 0) return `+${d.toFixed(1)}`;
  return Math.abs(d).toFixed(1);
}

// ── Sub-components ────────────────────────────────────────────

function TeamLogoMark({ team }: { team: StandingTeamDto }): React.ReactElement {
  const [failed, setFailed] = useState(false);
  const logoUrl = team.logoUrl as string | null;
  if (logoUrl != null && !failed) {
    return (
      <img
        className="st-logo"
        src={logoUrl}
        alt={team.abbr}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      className="st-logo-fallback"
      style={{ background: (team.primaryColorHex as string | null) ?? "#555" }}
    >
      {team.abbr.slice(0, 2)}
    </div>
  );
}

function HeaderBand({ title, tag, gbLabel = "GB" }: {
  title: string;
  tag: string;
  gbLabel?: string;
}): React.ReactElement {
  return (
    <div className="st-header-band">
      <div className="st-header-band__title-row">
        <span className="st-header-band__title">{title}</span>
        <span className="st-header-band__tag">{tag}</span>
      </div>
      <div className="st-row st-row--col-labels">
        <span /><span />
        <span className="st-th">Team</span>
        <span className="st-th st-th--right">W</span>
        <span className="st-th st-th--right">L</span>
        <span className="st-th st-th--right">PCT</span>
        <span className="st-th st-th--right">{gbLabel}</span>
        <span className="st-th st-th--right">L10</span>
        <span className="st-th st-th--right">STRK</span>
      </div>
    </div>
  );
}

function TeamRow({ team, pos, gb, tint, strong, topBorder = true }: {
  team: StandingTeamDto;
  pos: number;
  gb: string;
  tint?: boolean;
  strong?: boolean;
  topBorder?: boolean;
}): React.ReactElement {
  const wStreak = team.streak.startsWith("W");
  return (
    <div className={`st-row${tint ? " st-row--tint" : ""}${topBorder ? " st-row--border" : ""}`}>
      <span className={`st-pos num${strong ? " st-pos--strong" : ""}`}>{pos}</span>
      <TeamLogoMark team={team} />
      <span className={`st-team-name${strong ? " st-team-name--strong" : ""}`}>{team.teamName}</span>
      <span className={`st-td num${strong ? " st-td--strong" : " st-td--muted"}`}>{team.wins}</span>
      <span className="st-td num st-td--muted">{team.losses}</span>
      <span className={`st-td num${strong ? " st-td--accent" : " st-td--muted"}`}>{team.pct}</span>
      <span className="st-td num st-td--muted">{gb}</span>
      <span className="st-td num st-td--muted">{team.lastTen}</span>
      <span className={`st-td num${wStreak ? " st-td--positive" : " st-td--muted"}`}>{team.streak}</span>
    </div>
  );
}

function DivisionCard({ division }: { division: DivisionData }): React.ReactElement {
  const tag = division.divisionName.startsWith("A") ? "AL" : "NL";
  return (
    <div className="st-card">
      <HeaderBand title={division.divisionName} tag={tag} />
      {division.teams.map((team, i) => (
        <TeamRow
          key={team.abbr}
          team={team}
          pos={i + 1}
          gb={team.gamesBack}
          tint={i === 0}
          strong={i === 0}
          topBorder={i !== 0}
        />
      ))}
    </div>
  );
}

function WCDivider({ label }: { label: string }): React.ReactElement {
  return (
    <div className="st-wc-divider">
      <span className="st-wc-divider__label">{label}</span>
    </div>
  );
}

function WildCardCard({ league }: { league: LeagueData }): React.ReactElement {
  const { leaders, wildcard, below, cutoff } = buildWildCard(league);
  return (
    <div className="st-card">
      <HeaderBand title={league.leagueName} tag={league.abbr} gbLabel="WCGB" />
      {leaders.map((team, i) => (
        <TeamRow key={team.abbr} team={team} pos={i + 1} gb="–" tint strong topBorder={i !== 0} />
      ))}
      <WCDivider label="Wild Card" />
      {wildcard.map((team, i) => (
        <TeamRow
          key={team.abbr}
          team={team}
          pos={leaders.length + i + 1}
          gb={cutoff != null ? wcgbStr(team, cutoff) : "–"}
          tint
          topBorder={i !== 0}
        />
      ))}
      <WCDivider label="Out" />
      {below.map((team, i) => (
        <TeamRow
          key={team.abbr}
          team={team}
          pos={leaders.length + wildcard.length + i + 1}
          gb={cutoff != null ? wcgbStr(team, cutoff) : "–"}
          topBorder={i !== 0}
        />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function StandingsPage(): React.ReactElement {
  const [teams, setTeams] = useState<readonly StandingTeamDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState(0); // 0 = Divisional · 1 = Wild Card

  useEffect(() => {
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

  const leagues = groupByLeague(teams);

  return (
    <section className="page-container">
      <div className="page-header">
        <h2>Standings</h2>
        <span className="st-view-hint">
          {view === 0 ? "Division leader highlighted" : "Playoff picture — if the season ended today"}
        </span>
      </div>

      {isLoading && <div className="status-banner status-banner--loading">Loading standings…</div>}
      {!isLoading && error != null && <div className="status-banner status-banner--error">{error}</div>}
      {!isLoading && error == null && teams.length === 0 && (
        <div className="status-banner status-banner--empty">No standings data available.</div>
      )}

      {!isLoading && error == null && leagues.length > 0 && (
        <>
          <div className="st-toggle">
            <Segmented items={["Divisional", "Wild Card"]} active={view} onClick={setView} />
          </div>

          <div className="st-columns">
            {view === 0
              ? leagues.map((lg) => (
                  <div key={lg.leagueName} className="st-col">
                    {lg.divisions.map((div) => (
                      <DivisionCard key={div.divisionName} division={div} />
                    ))}
                  </div>
                ))
              : leagues.map((lg) => (
                  <div key={lg.leagueName} className="st-col">
                    <WildCardCard league={lg} />
                  </div>
                ))}
          </div>
        </>
      )}
    </section>
  );
}
