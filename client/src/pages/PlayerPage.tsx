// client/src/pages/PlayerPage.tsx
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

type Params = { mlbId?: string };
type PlayerPayload = Record<string, unknown>;
type PersonLike = Record<string, unknown>;

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

export default function PlayerPage(): ReactElement {
  const { mlbId } = useParams<Params>();

  const decodedId = useMemo((): string => {
    if (mlbId == null) return "";
    return safeDecode(mlbId);
  }, [mlbId]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [player, setPlayer] = useState<PlayerPayload | null>(null);

  useEffect((): void => {
    if (decodedId === "") return;

    const run = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        setPlayer(null);

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

  return (
    <section className="page-container">
      <div className="page-header">
        <h2>Player</h2>
        <Link className="back-link" to="/">
          ← Back
        </Link>
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
          {/* ===== Player summary UI ===== */}

          {/* Rows */}
          <div
            style={{
              marginTop: "0.75rem",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.45rem 1rem",
              fontSize: "0.95rem",
              alignItems: "start",
            }}
          >
            {/* Row 1 (now just another row in the same grid) */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "0.6rem",
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <span style={{ fontWeight: 900 }}>
                {view.number ? `#${view.number}` : "#—"}
              </span>

              <span
                style={{
                  fontWeight: 900,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                }}
                title={view.name ?? undefined}
              >
                {view.name ?? "—"}
              </span>

              <span style={{ fontWeight: 800, opacity: 0.85 }}>
                {view.pos ?? "—"}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                minWidth: 0,
                justifyContent: "flex-start", // <-- key: do NOT push to the far right
                textAlign: "left",
              }}
            >
              {view.teamId != null ? (
                <img
                  src={`https://www.mlbstatic.com/team-logos/${view.teamId}.svg`}
                  alt={view.teamFull ?? "Team"}
                  style={{
                    width: 26,
                    height: 26,
                    objectFit: "contain",
                    display: "block",
                    flexShrink: 0,
                  }}
                  loading="lazy"
                />
              ) : (
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: "0.8rem",
                    flexShrink: 0,
                  }}
                >
                  {initials(view.teamFull ?? "T")}
                </div>
              )}

              {/* Team name stack: never wraps; ellipsize if constrained */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  lineHeight: 1.05,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={view.teamShort ?? undefined}
                >
                  {`${view.teamShort ?? "—"} ${view.teamNick ?? ""}`}
                </div>
              </div>
            </div>

            {/* Remaining rows */}
            <div>{(view.birthCity ?? "—") + (view.birthCountry ? `, ${view.birthCountry}` : "")}</div>
            <div>
              Bats: <strong>{view.bats ?? "—"}</strong>
            </div>

            <div>{view.age != null ? `${view.age} years` : "—"}</div>
            <div>
              Throws: <strong>{view.throws ?? "—"}</strong>
            </div>

            <div>
              Ht: <strong>{view.height ?? "—"}</strong>
            </div>
            <div>
              Debut: <strong>{view.debut ?? "—"}</strong>
            </div>

            <div>
              Wt: <strong>{view.weight != null ? `${view.weight} lbs` : "—"}</strong>
            </div>
            <div />
          </div>
          {/* ===== Debug JSON (restored) ===== */}
          <div style={{ marginTop: "1.25rem" }}>
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
                maxHeight: "40vh",
                overflow: "auto",
                fontSize: "0.8rem",
              }}
            >
              {JSON.stringify(player, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}
