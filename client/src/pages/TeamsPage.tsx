import "./TeamsPage.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import type { StandingTeamDto } from "@bitslinger21/baseball-realtime-client";
import { standingsApi } from "../api/baseballApiClient";
import { PageTitle } from "../components/primitives/PageTitle";
import { BrandHeader } from "../components/primitives/BrandHeader";
import { getBackLabel } from "../utils/backLabel";
import { Segmented } from "../components/primitives/Segmented";
import { TEAMS } from "../utils/teams";
import { flatDivisions, mlbLogoUrl, divShortName, type DivisionData } from "../utils/teamDirectory";

const CURRENT_YEAR = String(new Date().getFullYear());

function TeamLogo({ abbr, size = 24 }: { abbr: string; size?: number }): React.ReactElement {
  const [failed, setFailed] = useState(false);
  const url = mlbLogoUrl(abbr);
  const info = TEAMS[abbr];

  if (url != null && !failed) {
    return (
      <img
        style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
        src={url}
        alt={abbr}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: Math.floor(size * 0.38), fontWeight: 700, color: "#fff",
        flexShrink: 0, background: info?.primary ?? "#555",
      }}
    >
      {abbr.slice(0, 2)}
    </div>
  );
}

function TeamRow({ team, showDivision = false }: { team: StandingTeamDto; showDivision?: boolean }): React.ReactElement {
  return (
    <Link to={`/team/${team.abbr}`} className="tms-row">
      <TeamLogo abbr={team.abbr} size={22} />
      <span className="tms-row-name">{team.teamName}</span>
      {showDivision && <span className="tms-row-div">{divShortName(team.divisionName)}</span>}
      <span className="tms-row-rec num">{team.wins}–{team.losses}</span>
      <span className="tms-row-pct num">{team.pct}</span>
    </Link>
  );
}

function DivisionGroup({ div }: { div: DivisionData }): React.ReactElement {
  return (
    <div className="tms-div">
      <div className="tms-div-hd">{divShortName(div.divisionName).toUpperCase()}</div>
      {div.teams.map((t) => (
        <TeamRow key={t.abbr} team={t} />
      ))}
    </div>
  );
}

export default function TeamsPage(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const [teams, setTeams] = useState<readonly StandingTeamDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"div" | "az">(() => {
    return (sessionStorage.getItem("teams-view") as "div" | "az") ?? "div";
  });

  const hasHistory = location.key !== "default";
  const locState = location.state as { from?: string; fromLabel?: string } | null;
  const backLabel = getBackLabel(locState?.from, locState?.fromLabel);

  const handleBack = useCallback((): void => {
    if (hasHistory) navigate(-1);
    else navigate("/");
  }, [navigate, hasHistory]);

  const handleViewChange = useCallback((idx: number): void => {
    const v = idx === 0 ? "div" : "az";
    setView(v);
    sessionStorage.setItem("teams-view", v);
  }, []);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await standingsApi.standingsGetStandings(CURRENT_YEAR);
        setTeams(res.data ?? []);
      } catch (e) {
        setError("Failed to load teams.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const divisions = useMemo(() => flatDivisions(teams), [teams]);
  const azTeams = useMemo(
    () => [...teams].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [teams],
  );

  return (
    <>
      <BrandHeader active="teams" backLabel={backLabel} onBack={handleBack} />
      <section className="page-container tms-page">
        <PageTitle
          title="Teams"
          subtitle="30 teams · 6 divisions"
          subtitleRight={
            <div className="tms-bar-l">
              <span className="tms-bar-lbl">Order</span>
              <Segmented
                items={["Division", "A–Z"]}
                active={view === "div" ? 0 : 1}
                onClick={handleViewChange}
                size="sm"
              />
            </div>
          }
        />

        {isLoading && (
          <div className="status-banner status-banner--loading">Loading teams…</div>
        )}
        {!isLoading && error != null && (
          <div className="status-banner status-banner--error">{error}</div>
        )}
        {!isLoading && error == null && teams.length === 0 && (
          <div className="status-banner status-banner--empty">No team data available.</div>
        )}

        {!isLoading && error == null && teams.length > 0 && (
          <div className="tms-wrap">
            {view === "div" ? (
              <div className="tms-divgrid">
                {divisions.map((div) => (
                  <DivisionGroup key={div.divisionName} div={div} />
                ))}
              </div>
            ) : (
              <div className="tms-azgrid">
                {azTeams.map((t) => (
                  <TeamRow key={t.abbr} team={t} showDivision />
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
