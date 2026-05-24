import { useMemo, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { BatterOverviewPanel } from "./player/BatterOverviewPanel";
import type { BatterOverviewDto } from "./player/batterOverview";
import { PitchingPanel } from "./player/PitchingPanel";
import type { PlayerPitchingDto } from "./player/playerPitching";
import { DrilldownPanel } from "./player/DrilldownPanel";
import type { PlayerDrilldownDto } from "./player/playerDrilldown";

type SplitRow = {
  splitCode: string;
  label: string;
  group?: string;
  games: number;
  atBats: number;
  hits: number;
  homeRuns: number;
  rbi: number;
  baseOnBalls: number;
  strikeOuts: number;
  avg: string;
  obp: string;
  slg: string;
  ops: string;
};

type PlayerSplitsPayload = {
  playerId: string;
  season: number;
  splits: SplitRow[];
};

type Params = { mlbId?: string };

type PlayerPayload = Record<string, unknown>;
type PersonLike = Record<string, unknown>;

type PlayerTab = "overview" | "stats" | "splits" | "pitching" | "history" | "debug";

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

function StatTile(props: {
  label: string;
  accent: string;
  value?: number | null;
  valueStr?: string | null;
}) {
  const display =
    props.valueStr ??
    (typeof props.value === "number" && Number.isFinite(props.value)
      ? String(props.value)
      : "—");

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        background: "#ffffff",
        overflow: "hidden",
        minWidth: 0,
        maxWidth: "124px",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignSelf: "stretch",
      }}
    >
      <div
        style={{
          background: props.accent,
          color: "#ffffff",
          fontSize: "0.78rem",
          fontWeight: 800,
          lineHeight: 1,
          padding: "0.45rem 0.6rem",
          textAlign: "left",
          whiteSpace: "nowrap",
        }}
      >
        {props.label}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: "2.05rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.18rem 0.35rem 0.2rem",
          color: props.accent,
          fontWeight: 900,
          fontSize: "1.05rem",
          lineHeight: 1,
          textAlign: "center",
          background: "#ffffff",
        }}
      >
        {display}
      </div>
    </div>
  );
}

function TabButton(props: {
  label: string;
  tab: PlayerTab;
  activeTab: PlayerTab;
  onClick: (tab: PlayerTab) => void;
  accent: string;
}) {
  const isActive = props.activeTab === props.tab;

  return (
    <button
      type="button"
      onClick={(): void => props.onClick(props.tab)}
      style={{
        borderRadius: 999,
        border: `1px solid ${isActive ? props.accent : "#e5e7eb"}`,
        background: isActive ? props.accent : "#fff",
        color: isActive ? "#fff" : "#111827",
        padding: "0.35rem 0.7rem",
        fontSize: "0.85rem",
        fontWeight: 800,
        cursor: "pointer",
        transition: "all 120ms ease",
      }}
    >
      {props.label}
    </button>
  );
}

const SPLIT_GROUP_LABELS: Record<string, string> = {
  handedness: "Handedness",
  venue: "Venue",
  dayNight: "Day / Night",
  pitchType: "Pitch Type",
  monthly: "Monthly",
};

const SPLIT_GROUP_ORDER = ["handedness", "venue", "dayNight", "pitchType", "monthly"];

function SplitsPanel(props: { splits: PlayerSplitsPayload | null; accent: string }) {
  const { splits, accent } = props;

  if (splits == null) {
    return <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Loading splits…</div>;
  }

  if (splits.splits.length === 0) {
    return <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>No splits data available.</div>;
  }

  const cols = ["Split", "G", "AB", "H", "HR", "RBI", "BB", "K", "AVG", "OBP", "SLG", "OPS"];

  const cellStyle = (isHeader: boolean, isLabel: boolean): React.CSSProperties => ({
    padding: isHeader ? "0.38rem 0.55rem" : "0.32rem 0.55rem",
    textAlign: isLabel ? "left" : "center",
    fontWeight: isHeader ? 800 : isLabel ? 700 : 500,
    fontSize: isHeader ? "0.76rem" : "0.85rem",
    whiteSpace: "nowrap",
    color: isHeader ? "#ffffff" : isLabel ? "#111827" : "#374151",
    background: isHeader ? accent : "transparent",
  });

  // Group rows, preserving server order within each group
  const grouped = new Map<string, SplitRow[]>();
  for (const row of splits.splits) {
    const g = row.group ?? "other";
    const bucket = grouped.get(g) ?? [];
    bucket.push(row);
    grouped.set(g, bucket);
  }

  const groupKeys = [
    ...SPLIT_GROUP_ORDER.filter((g) => grouped.has(g)),
    ...[...grouped.keys()].filter((g) => !SPLIT_GROUP_ORDER.includes(g)),
  ];

  return (
    <div style={{ overflowX: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {groupKeys.map((groupKey) => {
        const rows = grouped.get(groupKey)!;
        const groupLabel = SPLIT_GROUP_LABELS[groupKey] ?? groupKey;
        let rowIndex = 0;

        return (
          <div key={groupKey}>
            <div
              style={{
                fontSize: "0.78rem",
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#6b7280",
                marginBottom: "0.35rem",
              }}
            >
              {groupLabel}
            </div>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }}>
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th key={c} style={cellStyle(true, c === "Split")}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const i = rowIndex++;
                  return (
                    <tr key={row.splitCode} style={{ background: i % 2 === 0 ? "#f9fafb" : "#ffffff" }}>
                      <td style={cellStyle(false, true)}>{row.label}</td>
                      <td style={cellStyle(false, false)}>{row.games}</td>
                      <td style={cellStyle(false, false)}>{row.atBats}</td>
                      <td style={cellStyle(false, false)}>{row.hits}</td>
                      <td style={cellStyle(false, false)}>{row.homeRuns}</td>
                      <td style={cellStyle(false, false)}>{row.rbi}</td>
                      <td style={cellStyle(false, false)}>{row.baseOnBalls}</td>
                      <td style={cellStyle(false, false)}>{row.strikeOuts}</td>
                      <td style={{ ...cellStyle(false, false), color: accent, fontWeight: 900 }}>{row.avg}</td>
                      <td style={cellStyle(false, false)}>{row.obp}</td>
                      <td style={cellStyle(false, false)}>{row.slg}</td>
                      <td style={{ ...cellStyle(false, false), fontWeight: 900 }}>{row.ops}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function statRowStyle(maxColumns: number): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${maxColumns}, minmax(104px, 124px))`,
    gap: "0.6rem",
    alignItems: "stretch",
    justifyItems: "stretch",
    justifyContent: "start",
  };
}

export default function PlayerPage() {
  const { mlbId } = useParams<Params>();

  const [player, setPlayer] = useState<PlayerPayload | null>(null);
  const [overview, setOverview] = useState<BatterOverviewDto | null>(null);
  const [splits, setSplits] = useState<PlayerSplitsPayload | null>(null);
  const [pitching, setPitching] = useState<PlayerPitchingDto | null>(null);
  const [drilldown, setDrilldown] = useState<PlayerDrilldownDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headshotOk, setHeadshotOk] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<PlayerTab>("overview");

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

  useEffect(() => {
    if (decodedId === "" || activeTab !== "splits" || splits !== null) return;

    const run = async () => {
      try {
        const res = await fetch(`/api/players/${decodedId}/splits`);
        if (!res.ok) return;
        const json = (await res.json()) as PlayerSplitsPayload;
        setSplits(json);
      } catch {
        setSplits(null);
      }
    };

    void run();
  }, [decodedId, activeTab, splits]);

  useEffect(() => {
    if (decodedId === "" || activeTab !== "pitching" || pitching !== null) return;

    const run = async () => {
      try {
        const res = await fetch(`/api/players/${decodedId}/pitching`);
        if (!res.ok) return;
        const json = (await res.json()) as PlayerPitchingDto;
        setPitching(json);
      } catch {
        setPitching(null);
      }
    };

    void run();
  }, [decodedId, activeTab, pitching]);

  useEffect(() => {
    if (decodedId === "" || activeTab !== "history" || drilldown !== null) return;

    const run = async () => {
      try {
        const res = await fetch(`/api/players/${decodedId}/drilldown`);
        if (!res.ok) return;
        const json = (await res.json()) as PlayerDrilldownDto;
        setDrilldown(json);
      } catch {
        setDrilldown(null);
      }
    };

    void run();
  }, [decodedId, activeTab, drilldown]);

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

  function primaryPositionCode(person: PersonLike | null): string | null {
    if (person == null) return null;
    const primaryPosition = (person.primaryPosition as Record<string, unknown> | null) ?? null;
    return asStr(primaryPosition?.code) ?? asStr(primaryPosition?.abbreviation);
  }

  function formatInt(v: number | null | undefined): string {
    return typeof v === "number" && Number.isFinite(v) ? String(v) : "—";
  }

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
                overflow: "hidden",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  padding: "0.65rem 0.75rem",
                  borderBottom: "1px solid #e5e7eb",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <TabButton
                  label="Overview"
                  tab="overview"
                  activeTab={activeTab}
                  onClick={setActiveTab}
                  accent={accent}
                />
                <TabButton
                  label="Stats"
                  tab="stats"
                  activeTab={activeTab}
                  onClick={setActiveTab}
                  accent={accent}
                />
                <TabButton
                  label="Splits"
                  tab="splits"
                  activeTab={activeTab}
                  onClick={setActiveTab}
                  accent={accent}
                />
                <TabButton
                  label="Pitching"
                  tab="pitching"
                  activeTab={activeTab}
                  onClick={setActiveTab}
                  accent={accent}
                />
                <TabButton
                  label="History"
                  tab="history"
                  activeTab={activeTab}
                  onClick={setActiveTab}
                  accent={accent}
                />
                <TabButton
                  label="Debug"
                  tab="debug"
                  activeTab={activeTab}
                  onClick={setActiveTab}
                  accent={accent}
                />
              </div>

              <div style={{ padding: "0.9rem" }}>
                {activeTab === "overview" ? (
                  overview ? (
                    <BatterOverviewPanel overview={overview} accent={accent} />
                  ) : (
                    <div>Loading overview…</div>
                  )
                ) : activeTab === "stats" ? (
                  <div style={{ display: "grid", gap: "0.9rem" }}>
                    <div style={{ fontWeight: 900, fontSize: "1.05rem" }}>
                      {seasonStats?.season != null ? `${seasonStats.season} Season` : "Season"}
                    </div>

                    {primaryPositionCode(p) === "P" ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "140px minmax(0, 1fr)",
                          rowGap: "0.5rem",
                          columnGap: "0.75rem",
                          alignItems: "baseline",
                        }}
                      >
                        <div style={{ color: "#6b7280", fontWeight: 800 }}>IP</div>
                        <div style={{ fontWeight: 800 }}>{seasonStats?.pitching?.inningsPitched ?? "—"}</div>

                        <div style={{ color: "#6b7280", fontWeight: 800 }}>ERA</div>
                        <div style={{ fontWeight: 800 }}>{seasonStats?.pitching?.era ?? "—"}</div>

                        <div style={{ color: "#6b7280", fontWeight: 800 }}>WHIP</div>
                        <div style={{ fontWeight: 800 }}>{seasonStats?.pitching?.whip ?? "—"}</div>

                        <div style={{ color: "#6b7280", fontWeight: 800 }}>Strikeouts</div>
                        <div style={{ fontWeight: 800 }}>{formatInt(seasonStats?.pitching?.strikeOuts)}</div>

                        <div style={{ color: "#6b7280", fontWeight: 800 }}>W-L</div>
                        <div style={{ fontWeight: 800 }}>
                          {formatInt(seasonStats?.pitching?.wins)}-{formatInt(seasonStats?.pitching?.losses)}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div style={{ fontWeight: 800, marginBottom: "0.35rem" }}>Rate</div>
                          <div style={statRowStyle(5)}>
                            <StatTile label="AVG" accent={accent} valueStr={seasonStats?.batting?.avg} />
                            <StatTile label="OBP" accent={accent} valueStr={seasonStats?.batting?.obp} />
                            <StatTile label="SLG" accent={accent} valueStr={seasonStats?.batting?.slg} />
                            <StatTile label="OPS" accent={accent} valueStr={seasonStats?.batting?.ops} />
                          </div>
                        </div>

                        <div>
                          <div style={{ fontWeight: 800, marginBottom: "0.35rem" }}>Production</div>
                          <div style={statRowStyle(5)}>
                            <StatTile label="Runs" accent={accent} value={seasonStats?.batting?.runs} />
                            <StatTile label="RBI" accent={accent} value={seasonStats?.batting?.rbi} />
                            <StatTile label="HR" accent={accent} value={seasonStats?.batting?.homeRuns} />
                          </div>
                        </div>

                        <div>
                          <div style={{ fontWeight: 800, marginBottom: "0.35rem" }}>Contact</div>
                          <div style={statRowStyle(5)}>
                            <StatTile label="Hits" accent={accent} value={seasonStats?.batting?.hits} />
                            <StatTile label="Walks" accent={accent} value={seasonStats?.batting?.baseOnBalls} />
                            <StatTile label="Strikeouts" accent={accent} value={seasonStats?.batting?.strikeOuts} />
                          </div>
                        </div>

                        <div>
                          <div style={{ fontWeight: 800, marginBottom: "0.35rem" }}>Volume</div>
                          <div style={statRowStyle(5)}>
                            <StatTile label="Games" accent={accent} value={seasonStats?.batting?.gamesPlayed} />
                            <StatTile label="At-Bats" accent={accent} value={seasonStats?.batting?.atBats} />
                            <StatTile label="Doubles" accent={accent} value={seasonStats?.batting?.doubles} />
                            <StatTile label="Triples" accent={accent} value={seasonStats?.batting?.triples} />
                          </div>
                        </div>

                        <div>
                          <div>
                            <div style={{ fontWeight: 800, marginBottom: "0.35rem" }}>Speed</div>
                            <div style={statRowStyle(5)}>
                              <StatTile label="SB" accent={accent} value={seasonStats?.batting?.stolenBases} />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : activeTab === "splits" ? (
                  <SplitsPanel splits={splits} accent={accent} />
                ) : activeTab === "pitching" ? (
                  <PitchingPanel pitching={pitching} accent={accent} />
                ) : activeTab === "history" ? (
                  <DrilldownPanel drilldown={drilldown} accent={accent} />
                ) : (
                  <pre
                    style={{
                      padding: "0.75rem",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                      maxHeight: "55vh",
                      overflow: "auto",
                      fontSize: "0.8rem",
                    }}
                  >
                    {JSON.stringify(player, null, 2)}
                  </pre>
                )}
              </div>
            </main>
          </div>
        </div>
      )}
    </section>
  );
}