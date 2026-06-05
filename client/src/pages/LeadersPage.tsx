import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type LeaderEntry = {
  rank: number;
  playerId: number;
  playerName: string;
  teamName: string;
  teamId: number;
  value: string;
};

type LeaderCategory = {
  category: string;
  label: string;
  leaders: LeaderEntry[];
};

type LeagueLeadersPayload = {
  season: number;
  batting: LeaderCategory[];
  pitching: LeaderCategory[];
};

type LeadersGroup = "batting" | "pitching";

function TeamLogo(props: { teamId: number; teamName: string }) {
  const [ok, setOk] = useState(true);
  if (!ok || props.teamId === 0) return null;
  return (
    <img
      src={`https://www.mlbstatic.com/team-logos/${props.teamId}.svg`}
      alt={props.teamName}
      style={{ width: 16, height: 16, objectFit: "contain", flexShrink: 0 }}
      onError={() => setOk(false)}
    />
  );
}

function CategoryCard(props: { cat: LeaderCategory; accent: string }) {
  const { cat, accent } = props;
  const navigate = useNavigate();

  return (
    <div
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        background: "var(--color-surface)",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      <div
        style={{
          background: accent,
          color: "#fff",
          padding: "0.42rem 0.7rem",
          fontWeight: 900,
          fontSize: "0.82rem",
          letterSpacing: "0.01em",
        }}
      >
        {cat.label}
      </div>

      {cat.leaders.length === 0 ? (
        <div style={{ padding: "0.6rem 0.7rem", color: "var(--color-text-faint)", fontSize: "0.82rem" }}>
          No data
        </div>
      ) : (
        <div>
          {cat.leaders.map((entry, i) => (
            <div
              key={entry.playerId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.32rem 0.7rem",
                background: i % 2 === 0 ? "var(--color-bg)" : "var(--color-surface)",
                borderTop: i === 0 ? "none" : "1px solid var(--color-border)",
                cursor: "pointer",
              }}
              onClick={() => navigate(`/player/${entry.playerId}`)}
            >
              <span
                style={{
                  width: "1.4rem",
                  flexShrink: 0,
                  textAlign: "right",
                  fontWeight: 800,
                  fontSize: "0.75rem",
                  color: i === 0 ? accent : "var(--color-text-faint)",
                }}
              >
                {entry.rank}
              </span>

              <TeamLogo teamId={entry.teamId} teamName={entry.teamName} />

              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: "0.85rem",
                  fontWeight: i === 0 ? 800 : 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "var(--color-text)",
                }}
              >
                {entry.playerName}
              </span>

              <span
                style={{
                  fontWeight: 900,
                  fontSize: "0.88rem",
                  color: i === 0 ? accent : "var(--color-text)",
                  flexShrink: 0,
                }}
              >
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LeadersPage() {
  const [data, setData] = useState<LeagueLeadersPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<LeadersGroup>("batting");

  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch("/api/leaders");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as LeagueLeadersPayload;
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      } finally {
        setIsLoading(false);
      }
    };
    void run();
  }, []);

  const accent = "#1d4ed8";
  const categories = group === "batting" ? (data?.batting ?? []) : (data?.pitching ?? []);

  const groupBtn = (label: string, key: LeadersGroup) => {
    const isActive = group === key;
    return (
      <button
        type="button"
        key={key}
        onClick={() => setGroup(key)}
        style={{
          padding: "0.35rem 0.85rem",
          borderRadius: 999,
          border: `1px solid ${isActive ? accent : "var(--color-border)"}`,
          background: isActive ? accent : "var(--color-surface)",
          color: isActive ? "#fff" : "var(--color-text)",
          fontSize: "0.85rem",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <section className="page-container">
      <div className="page-header">
        <h2>League Leaders</h2>
        {data != null && (
          <span style={{ fontSize: "0.82rem", color: "var(--color-text-faint)", fontWeight: 600 }}>
            {data.season} Season
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="status-banner">Loading…</div>
      ) : error ? (
        <div className="status-banner">Error: {error}</div>
      ) : (
        <div style={{ padding: "0.75rem 1rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            {groupBtn("Batting", "batting")}
            {groupBtn("Pitching", "pitching")}
          </div>

          {data == null ? (
            <div className="status-banner">No data.</div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "0.85rem",
              }}
            >
              {categories.map((cat) => (
                <CategoryCard key={cat.category} cat={cat} accent={accent} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
