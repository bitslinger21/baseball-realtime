// client/src/pages/PlayerPage.tsx
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type Params = { mlbId?: string };
type PlayerPayload = Record<string, unknown>;
type PersonLike = Record<string, unknown>;
type PlayerTab = "overview" | "stats" | "splits" | "debug";

type SeasonBattingStats = {
  avg?: string | null;
  obp?: string | null;
  slg?: string | null;
  ops?: string | null;
  homeRuns?: number | null;
  rbi?: number | null;
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

function pickSeasonStats(payload: PlayerPayload | null): SeasonStatsPayload | null {
  if (payload == null) return null;

  const stats = payload.seasonStats as unknown;
  if (stats != null && typeof stats === "object") {
    return stats as SeasonStatsPayload;
  }

  return null;
}

function primaryPositionCode(person: PersonLike | null): string | null {
  if (person == null) return null;
  const primaryPosition = (person.primaryPosition as Record<string, unknown> | null) ?? null;
  return asStr(primaryPosition?.code) ?? asStr(primaryPosition?.abbreviation);
}

function formatInt(v: number | null | undefined): string {
  return typeof v === "number" && Number.isFinite(v) ? String(v) : "—";
}

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function pickPerson(payload: PlayerPayload | null): PersonLike | null {
  if (payload == null) return null;

  // Server wrapper: { ok, mlbId, season, data: { people: [...] } }
  const data = payload.data as unknown;
  if (data != null && typeof data === "object") {
    const people = (data as Record<string, unknown>).people as unknown;
    if (Array.isArray(people) && people.length > 0) {
      const p0 = people[0] as unknown;
      if (p0 != null && typeof p0 === "object") return p0 as PersonLike;
    }
  }

  // Direct MLB payload: { people: [...] }
  const people = payload.people as unknown;
  if (Array.isArray(people) && people.length > 0) {
    const p0 = people[0] as unknown;
    if (p0 != null && typeof p0 === "object") return p0 as PersonLike;
  }

  return null;
}

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
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
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

/**
 * Placeholder team accent color derived from teamId.
 * Later you can replace this with a real mapping table (teamId -> hex).
 */
function teamAccentFromTeamId(teamId: number | null): string {
  if (teamId == null) return "hsl(210 15% 60%)";
  const hue = Math.abs(teamId * 37) % 360;
  return `hsl(${hue} 65% 45%)`;
}

/**
 * Headshot URL placeholder. If it fails, UI falls back to initials.
 * If you later add an explicit headshot URL from backend, use it instead.
 */
function headshotUrlFromMlbId(mlbId: string): string {
  // This is a commonly-used MLB static pattern; if it 404s, we fall back gracefully.
  return `https://img.mlbstatic.com/mlb-photos/image/upload/v1/people/${encodeURIComponent(
    mlbId,
  )}/headshot/67/current`;
}

export default function PlayerPage(): ReactElement {
  const { mlbId } = useParams<Params>();

  const decodedId = useMemo((): string => {
    if (mlbId == null) return "";
    return safeDecode(mlbId);
  }, [mlbId]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [player, setPlayer] = useState<PlayerPayload | null>(null);

  const [activeTab, setActiveTab] = useState<PlayerTab>("overview");
  const [headshotOk, setHeadshotOk] = useState<boolean>(true);

  useEffect((): void => {
    if (decodedId === "") return;

    const run = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        setPlayer(null);
        setActiveTab("overview");
        setHeadshotOk(true);

        const res = await fetch(`/api/players/${encodeURIComponent(decodedId)}`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`);
        }

        const json = (await res.json()) as PlayerPayload;
        setPlayer(json);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load player.";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, [decodedId]);

  const p = useMemo((): PersonLike | null => pickPerson(player), [player]);
  const seasonStats = useMemo((): SeasonStatsPayload | null => pickSeasonStats(player), [player]);

  const view = useMemo(() => {
    const empty = {
      number: null as string | null,
      name: null as string | null,
      pos: null as string | null,
      teamFull: null as string | null,
      teamId: null as number | null,
      teamShort: null as string | null,
      teamNick: null as string | null,
      birthCity: null as string | null,
      birthCountry: null as string | null,
      age: null as number | null,
      bats: null as string | null,
      throws: null as string | null,
      height: null as string | null,
      weight: null as number | null,
      debut: null as string | null,
    };

    if (p == null) return empty;

    const primaryNumber = asStr(p.primaryNumber);
    const fullName = asStr(p.fullName);

    const primaryPosition = (p.primaryPosition as unknown) as Record<string, unknown> | null;
    const pos = asStr(primaryPosition?.abbreviation) ?? asStr(primaryPosition?.name);

    const currentTeam = (p.currentTeam as unknown) as Record<string, unknown> | null;
    const teamFull = asStr(currentTeam?.name);
    const teamId = asNum(currentTeam?.id);

    const birthCity = asStr(p.birthCity);
    const birthCountry = asStr(p.birthCountry);

    const age = asNum(p.currentAge);

    const batSide = (p.batSide as unknown) as Record<string, unknown> | null;
    const pitchHand = (p.pitchHand as unknown) as Record<string, unknown> | null;

    const bats = asStr(batSide?.description) ?? asStr(batSide?.code);
    const throwsHand = asStr(pitchHand?.description) ?? asStr(pitchHand?.code);

    const height = asStr(p.height);
    const weight = asNum(p.weight);

    const debut = formatDebut(asStr(p.mlbDebutDate));

    return {
      number: primaryNumber,
      name: fullName,
      pos,
      teamFull,
      teamId,
      teamShort: teamFull ? teamNameToShort(teamFull) : null,
      teamNick: teamFull ? teamNameToNickname(teamFull) : null,
      birthCity,
      birthCountry,
      age,
      bats,
      throws: throwsHand,
      height,
      weight,
      debut,
    };
  }, [p]);

  const accent = useMemo((): string => teamAccentFromTeamId(view.teamId), [view.teamId]);

  const compactStats = useMemo((): { text: string; title: string | undefined } => {
    const posCode = primaryPositionCode(p);
    const batting = seasonStats?.batting ?? null;
    const pitching = seasonStats?.pitching ?? null;

    const looksLikePitcher =
      posCode === "P" ||
      (pitching?.inningsPitched != null &&
        pitching.inningsPitched.trim() !== "" &&
        pitching.era != null);

    if (looksLikePitcher) {
      return {
        text: `${pitching?.inningsPitched ?? "—"} / ${pitching?.era ?? "—"} / ${pitching?.whip ?? "—"} / ${formatInt(
          pitching?.strikeOuts,
        )}`,
        title: "IP / ERA / WHIP / Strikeouts",
      };
    }

    return {
      text: `${batting?.avg ?? "—"} / ${batting?.obp ?? "—"} / ${batting?.slg ?? "—"}`,
      title: "AVG / OBP / SLG",
    };
  }, [p, seasonStats]);

  const sidebarFromText = useMemo((): string => {
    const city = view.birthCity ?? null;
    const country = view.birthCountry ?? null;
    if (city == null && country == null) return "—";
    if (city != null && country != null) return `${city}, ${country}`;
    return city ?? country ?? "—";
  }, [view.birthCity, view.birthCountry]);

  const navigate = useNavigate();

  return (
    <section className="page-container">
      <div className="page-header">
        <h2>Player</h2>
        <button
          type="button"
          className="back-link"
          onClick={(): void => {
            navigate(-1);
          }}
        >
          ← Back
        </button>
      </div>

      {decodedId === "" ? (
        <div className="status-banner status-banner--empty">Missing player id.</div>
      ) : isLoading ? (
        <div className="status-banner status-banner--loading">Loading player {decodedId}…</div>
      ) : error != null ? (
        <div className="status-banner status-banner--error">
          Failed to load player <strong>{decodedId}</strong>. Details: {error}
        </div>
      ) : p == null ? (
        <div className="status-banner status-banner--empty">
          No data returned for <strong>{decodedId}</strong>.
        </div>
      ) : (
        <div className="game-detail" style={{ padding: "0.9rem 1rem" }}>
          {/* ===== Two-column layout ===== */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "300px minmax(0, 1fr)",
              gap: "1rem",
              alignItems: "start",
            }}
          >
            {/* ===== LEFT: Sticky sidebar ===== */}
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
              {/* Accent bar */}
              <div style={{ height: 6, background: accent }} />

              {/* Identity row */}
              <div style={{ padding: "0.85rem 0.85rem 0.75rem" }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  {/* Headshot */}
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
                    {/* [number][name][position] */}
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

                      <div style={{ fontWeight: 800, opacity: 0.8, whiteSpace: "nowrap" }}>
                        {view.pos ?? "—"}
                      </div>
                    </div>

                    {/* Compact stat line / ribbon */}
                    <div
                      style={{ marginTop: "0.25rem", fontSize: "0.85rem", opacity: 0.85 }}
                      title={compactStats.title}
                    >
                      {seasonStats?.season != null ? `${seasonStats.season}: ` : ""}
                      {compactStats.text}
                    </div>
                  </div>
                </div>

                {/* Team row */}
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

                {/* Bio fields list (label/value grid) */}
                <div
                  style={{
                    marginTop: "0.85rem",
                    display: "grid",
                    gridTemplateColumns: "92px minmax(0, 1fr)", // label col, value col
                    columnGap: "0.6rem",
                    rowGap: "0.45rem",
                    fontSize: "0.92rem",
                    alignItems: "baseline",
                  }}
                >
                  <div style={{ opacity: 0.75, fontWeight: 800 }}>From</div>
                  <div style={{ fontWeight: 800, minWidth: 0 }}>{sidebarFromText}</div>

                  <div style={{ opacity: 0.75, fontWeight: 800 }}>Debut</div>
                  <div style={{ fontWeight: 800, minWidth: 0 }}>{view.debut ?? "—"}</div>

                  <div style={{ opacity: 0.75, fontWeight: 800 }}>Age</div>
                  <div style={{ fontWeight: 800, minWidth: 0 }}>
                    {view.age != null ? `${view.age}` : "—"}
                  </div>

                  <div style={{ opacity: 0.75, fontWeight: 800 }}>Height</div>
                  <div style={{ fontWeight: 800, minWidth: 0 }}>{view.height ?? "—"}</div>

                  <div style={{ opacity: 0.75, fontWeight: 800 }}>Weight</div>
                  <div style={{ fontWeight: 800, minWidth: 0 }}>
                    {view.weight != null ? `${view.weight} lbs` : "—"}
                  </div>

                  <div style={{ opacity: 0.75, fontWeight: 800 }}>Bats</div>
                  <div style={{ fontWeight: 800, minWidth: 0 }}>{view.bats ?? "—"}</div>

                  <div style={{ opacity: 0.75, fontWeight: 800 }}>Throws</div>
                  <div style={{ fontWeight: 800, minWidth: 0 }}>{view.throws ?? "—"}</div>
                </div>
              </div>
            </aside>

            {/* ===== RIGHT: Menu + panel ===== */}
            <main
              style={{
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: "#fff",
                overflow: "hidden",
                minWidth: 0,
              }}
            >
              {/* Placeholder menu */}
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
                <TabButton label="Overview" tab="overview" activeTab={activeTab} onClick={setActiveTab} accent={accent} />
                <TabButton label="Stats" tab="stats" activeTab={activeTab} onClick={setActiveTab} accent={accent} />
                <TabButton label="Splits" tab="splits" activeTab={activeTab} onClick={setActiveTab} accent={accent} />
                <TabButton label="Debug" tab="debug" activeTab={activeTab} onClick={setActiveTab} accent={accent} />
              </div>

              {/* Placeholder panel */}
              <div style={{ padding: "0.9rem 0.9rem" }}>
                {activeTab === "overview" ? (
                  <div>
                    <div style={{ fontWeight: 900, fontSize: "1.05rem" }}>Overview</div>
                    <div style={{ marginTop: "0.4rem", opacity: 0.85 }}>
                      Placeholder panel. Next: show season totals, career totals, and key badges.
                    </div>
                  </div>
                ) : activeTab === "stats" ? (
                  <div>
                    <div style={{ fontWeight: 900, fontSize: "1.05rem" }}>
                      Stats {seasonStats?.season != null ? `· ${seasonStats.season}` : ""}
                    </div>

                    {primaryPositionCode(p) === "P" ? (
                      <div
                        style={{
                          marginTop: "0.75rem",
                          display: "grid",
                          gridTemplateColumns: "140px minmax(0, 1fr)",
                          rowGap: "0.5rem",
                          columnGap: "0.75rem",
                          alignItems: "baseline",
                        }}
                      >
                        <div style={{ opacity: 0.75, fontWeight: 800 }}>IP</div>
                        <div style={{ fontWeight: 800 }}>{seasonStats?.pitching?.inningsPitched ?? "—"}</div>

                        <div style={{ opacity: 0.75, fontWeight: 800 }}>ERA</div>
                        <div style={{ fontWeight: 800 }}>{seasonStats?.pitching?.era ?? "—"}</div>

                        <div style={{ opacity: 0.75, fontWeight: 800 }}>WHIP</div>
                        <div style={{ fontWeight: 800 }}>{seasonStats?.pitching?.whip ?? "—"}</div>

                        <div style={{ opacity: 0.75, fontWeight: 800 }}>Strikeouts</div>
                        <div style={{ fontWeight: 800 }}>{formatInt(seasonStats?.pitching?.strikeOuts)}</div>

                        <div style={{ opacity: 0.75, fontWeight: 800 }}>W-L</div>
                        <div style={{ fontWeight: 800 }}>
                          {formatInt(seasonStats?.pitching?.wins)}-{formatInt(seasonStats?.pitching?.losses)}
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: "0.75rem",
                          display: "grid",
                          gridTemplateColumns: "140px minmax(0, 1fr)",
                          rowGap: "0.5rem",
                          columnGap: "0.75rem",
                          alignItems: "baseline",
                        }}
                      >
                        <div style={{ opacity: 0.75, fontWeight: 800 }}>AVG</div>
                        <div style={{ fontWeight: 800 }}>{seasonStats?.batting?.avg ?? "—"}</div>

                        <div style={{ opacity: 0.75, fontWeight: 800 }}>OBP</div>
                        <div style={{ fontWeight: 800 }}>{seasonStats?.batting?.obp ?? "—"}</div>

                        <div style={{ opacity: 0.75, fontWeight: 800 }}>SLG</div>
                        <div style={{ fontWeight: 800 }}>{seasonStats?.batting?.slg ?? "—"}</div>

                        <div style={{ opacity: 0.75, fontWeight: 800 }}>OPS</div>
                        <div style={{ fontWeight: 800 }}>{seasonStats?.batting?.ops ?? "—"}</div>

                        <div style={{ opacity: 0.75, fontWeight: 800 }}>HR</div>
                        <div style={{ fontWeight: 800 }}>{formatInt(seasonStats?.batting?.homeRuns)}</div>

                        <div style={{ opacity: 0.75, fontWeight: 800 }}>RBI</div>
                        <div style={{ fontWeight: 800 }}>{formatInt(seasonStats?.batting?.rbi)}</div>
                      </div>
                    )}
                  </div>
                ) : activeTab === "splits" ? (
                  <div>
                    <div style={{ fontWeight: 900, fontSize: "1.05rem" }}>Splits</div>
                    <div style={{ marginTop: "0.4rem", opacity: 0.85 }}>
                      Placeholder panel. Next: vs LHP/RHP, home/away, day/night, RISP.
                    </div>
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                        opacity: 0.7,
                        marginBottom: "0.35rem",
                      }}
                    >
                      DEBUG · Raw server payload
                    </div>

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
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      )}
    </section>
  );
}

function TabButton(props: {
  label: string;
  tab: PlayerTab;
  activeTab: PlayerTab;
  onClick: (tab: PlayerTab) => void;
  accent: string;
}): ReactElement {
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
