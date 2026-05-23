import { useMemo, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { BatterOverviewPanel } from "./player/BatterOverviewPanel";
import type { BatterOverviewDto } from "./player/batterOverview";

type Params = { mlbId?: string };

type PlayerPayload = Record<string, unknown>;
type PersonLike = Record<string, unknown>;

function asStr(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

function asNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function formatDebut(dateIso: string | null): string | null {
  if (dateIso == null) return null;

  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return dateIso;

  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function teamAccentFromTeamId(teamId: number | null): string {
  if (teamId == null) return "hsl(210 15% 60%)";

  const hue = Math.abs(teamId * 37) % 360;
  return `hsl(${hue} 65% 45%)`;
}

function teamNameToShort(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return parts.slice(0, -1).join(" ");
}

function teamNameToNickname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 0 ? parts[parts.length - 1] : name;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return (parts[0]!.slice(0, 1) + parts[parts.length - 1]!.slice(0, 1)).toUpperCase();
}

type SeasonBattingStats = {
  avg?: string | null;
  obp?: string | null;
  slg?: string | null;
  ops?: string | null;
  homeRuns?: number | null;
  rbi?: number | null;
  runs?: number | null;
  hits?: number | null;
  doubles?: number | null;
  triples?: number | null;
  baseOnBalls?: number | null;
  strikeOuts?: number | null;
  stolenBases?: number | null;
  gamesPlayed?: number | null;
  atBats?: number | null;
};

type SeasonPitchingStats = {
  inningsPitched?: string | null;
  era?: string | null;
  whip?: string | null;
  strikeOuts?: number | null;
  wins?: number | null;
  losses?: number | null;
};

type SeasonStatsPayload = {
  season?: string | null;
  batting?: SeasonBattingStats | null;
  pitching?: SeasonPitchingStats | null;
};

export default function PlayerPage() {
  const { mlbId } = useParams<Params>();

  const [player, setPlayer] = useState<PlayerPayload | null>(null);
  const [overview, setOverview] = useState<BatterOverviewDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headshotOk, setHeadshotOk] = useState<boolean>(true);

  const decodedId = useMemo(() => {
    if (mlbId == null) return "";
    try {
      return decodeURIComponent(mlbId);
    } catch {
      return mlbId;
    }
  }, [mlbId]);

  useEffect(() => {
    if (decodedId === "") return;

    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(`/api/players/${decodedId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = (await res.json()) as PlayerPayload;
        setPlayer(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, [decodedId]);

  useEffect(() => {
    if (decodedId === "") return;

    const run = async () => {
      try {
        const res = await fetch(`/api/players/${decodedId}/overview/batter`);
        if (!res.ok) return;

        const json = (await res.json()) as BatterOverviewDto;
        setOverview(json);
      } catch {
        setOverview(null);
      }
    };

    void run();
  }, [decodedId]);

  function pickPerson(payload: PlayerPayload | null): PersonLike | null {
    if (payload == null) return null;

    const data = payload.data as unknown;
    if (data != null && typeof data === "object") {
      const people = (data as Record<string, unknown>).people as unknown;
      if (Array.isArray(people) && people.length > 0) {
        const p0 = people[0] as unknown;
        if (p0 != null && typeof p0 === "object") return p0 as PersonLike;
      }
    }

    const people = payload.people as unknown;
    if (Array.isArray(people) && people.length > 0) {
      const p0 = people[0] as unknown;
      if (p0 != null && typeof p0 === "object") return p0 as PersonLike;
    }

    return null;
  }

  const person = useMemo(() => pickPerson(player), [player]);

  const p: PersonLike | null = pickPerson(player);
  const seasonStats: SeasonStatsPayload | null = pickSeasonStats(player);

  const name = (p?.fullName as string) ?? "—";
  const number = (p?.primaryNumber as string) ?? "—";

  const view = (() => {
    if (p == null) {
      return {
        name: null,
        number: null,
        pos: null,
        teamFull: null,
        teamId: null,
        birthCity: null,
        birthCountry: null,
        age: null,
        bats: null,
        throws: null,
        height: null,
        weight: null,
        debut: null,
      };
    }

    const primaryPosition = (p.primaryPosition as Record<string, unknown> | null) ?? null;
    const currentTeam = (p.currentTeam as Record<string, unknown> | null) ?? null;
    const batSide = (p.batSide as Record<string, unknown> | null) ?? null;
    const pitchHand = (p.pitchHand as Record<string, unknown> | null) ?? null;

    return {
      name: asStr(p.fullName),
      number: asStr(p.primaryNumber),
      pos: asStr(primaryPosition?.abbreviation) ?? asStr(primaryPosition?.name),
      teamFull: asStr(currentTeam?.name),
      teamId: asNum(currentTeam?.id),
      birthCity: asStr(p.birthCity),
      birthCountry: asStr(p.birthCountry),
      age: asNum(p.currentAge),
      bats: asStr(batSide?.description) ?? asStr(batSide?.code),
      throws: asStr(pitchHand?.description) ?? asStr(pitchHand?.code),
      height: asStr(p.height),
      weight: asNum(p.weight),
      debut: formatDebut(asStr(p.mlbDebutDate)),
    };
  })();

  function pickSeasonStats(payload: PlayerPayload | null): SeasonStatsPayload | null {
    if (payload == null) return null;

    const stats = payload.seasonStats as unknown;
    if (stats != null && typeof stats === "object") {
      return stats as SeasonStatsPayload
    }

    return null;
  }

  function headshotUrlFromMlbId(mlbId: string): string {
    return `https://img.mlbstatic.com/mlb-photos/image/upload/v1/people/${encodeURIComponent(
      mlbId,
    )}/headshot/67/current`;
  }

  const accent = teamAccentFromTeamId(view.teamId);
  const compactStats = (() => {
    const batting = seasonStats?.batting;
    return {
      text: `${batting?.avg ?? "—"} / ${batting?.obp ?? "—"} / ${batting?.slg ?? "—"}`,
      title: "AVG / OBP / SLG",
    };
  })();
  const sidebarFromText =
    view.birthCity && view.birthCountry
      ? `${view.birthCity}, ${view.birthCountry}`
      : view.birthCity ?? view.birthCountry ?? "—";

  return (
    <section className="page-container">
      <div className="page-header">
        <h2>Player</h2>
      </div>

      {decodedId === "" ? (
        <div className="status-banner">Missing player id.</div>
      ) : isLoading ? (
        <div className="status-banner">Loading…</div>
      ) : error ? (
        <div className="status-banner">Error: {error}</div>
      ) : person == null ? (
        <div className="status-banner">No data.</div>
      ) : (
        <div className="game-detail" style={{ padding: "1rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "280px 1fr",
              gap: "1rem",
            }}
          >
            {/* LEFT PANEL */}
            <aside
              style={{
                position: "sticky",
                top: "0.75rem",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: "#fff",
                overflow: "hidden",
              }}
            >
              <div style={{ height: 6, background: accent }} />

              <div style={{ padding: "0.85rem 0.85rem 0.75rem" }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 14,
                      border: "1px solid #e5e7eb",
                      overflow: "hidden",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#fafafa",
                      fontWeight: 900,
                    }}
                    aria-label="Player headshot"
                    title={view.name ?? undefined}
                  >
                    {headshotOk ? (
                      <img
                        src={headshotUrlFromMlbId(decodedId)}
                        alt={view.name ?? "Player"}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(): void => setHeadshotOk(false)}
                      />
                    ) : (
                      <span style={{ fontSize: "1.05rem" }}>{initials(view.name ?? "P")}</span>
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
                      <div style={{ fontWeight: 900, whiteSpace: "nowrap" }}>
                        {view.number ? `#${view.number}` : "#—"}
                      </div>

                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: "1.05rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          minWidth: 0,
                        }}
                        title={view.name ?? undefined}
                      >
                        {view.name ?? "—"}
                      </div>

                      <div style={{ fontWeight: 800, color: "#6b7280", whiteSpace: "nowrap" }}>
                        {view.pos ?? "—"}
                      </div>
                    </div>

                    <div
                      style={{ marginTop: "0.25rem", fontSize: "0.85rem", color: "#4b5563" }}
                      title={compactStats.title}
                    >
                      {seasonStats?.season != null ? `${seasonStats.season}: ` : ""}
                      {compactStats.text}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.6rem" }}>
                  {view.teamId != null ? (
                    <img
                      src={`https://www.mlbstatic.com/team-logos/${view.teamId}.svg`}
                      alt={view.teamFull ?? "Team"}
                      style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        border: "1px solid #e5e7eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: "0.7rem",
                        flexShrink: 0,
                      }}
                    >
                      {initials(view.teamFull ?? "T")}
                    </div>
                  )}

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, lineHeight: 1.15, overflow: "hidden" }}>
                      {view.teamFull ?? "—"}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "0.85rem",
                    display: "grid",
                    gridTemplateColumns: "92px minmax(0, 1fr)",
                    columnGap: "0.6rem",
                    rowGap: "0.45rem",
                    fontSize: "0.92rem",
                    alignItems: "baseline",
                  }}
                >
                  <div style={{ color: "#6b7280", fontWeight: 800 }}>From</div>
                  <div style={{ fontWeight: 800, minWidth: 0 }}>{sidebarFromText}</div>

                  <div style={{ color: "#6b7280", fontWeight: 800 }}>Debut</div>
                  <div style={{ fontWeight: 800, minWidth: 0 }}>{view.debut ?? "—"}</div>

                  <div style={{ color: "#6b7280", fontWeight: 800 }}>Age</div>
                  <div style={{ fontWeight: 800, minWidth: 0 }}>
                    {view.age != null ? `${view.age}` : "—"}
                  </div>

                  <div style={{ color: "#6b7280", fontWeight: 800 }}>Height</div>
                  <div style={{ fontWeight: 800, minWidth: 0 }}>{view.height ?? "—"}</div>

                  <div style={{ color: "#6b7280", fontWeight: 800 }}>Weight</div>
                  <div style={{ fontWeight: 800, minWidth: 0 }}>
                    {view.weight != null ? `${view.weight} lbs` : "—"}
                  </div>

                  <div style={{ color: "#6b7280", fontWeight: 800 }}>Bats</div>
                  <div style={{ fontWeight: 800, minWidth: 0 }}>{view.bats ?? "—"}</div>

                  <div style={{ color: "#6b7280", fontWeight: 800 }}>Throws</div>
                  <div style={{ fontWeight: 800, minWidth: 0 }}>{view.throws ?? "—"}</div>
                </div>
              </div>
            </aside>

            {/* RIGHT PANEL */}
            <main
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                background: "#fff",
                padding: "0.9rem",
              }}
            >
              {overview ? (
                <BatterOverviewPanel overview={overview} />
              ) : (
                <div>Loading overview…</div>
              )}
            </main>
          </div>
        </div>
      )}
    </section>
  );
}