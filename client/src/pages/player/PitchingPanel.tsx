import type { PlayerPitchingDto } from "./playerPitching";

function pct(v: number | null): string {
  if (v == null) return "—";
  return `${v.toFixed(1)}%`;
}

function vel(v: number | null): string {
  if (v == null) return "—";
  return `${v.toFixed(1)}`;
}

function spin(v: number | null): string {
  if (v == null) return "—";
  return Math.round(v).toString();
}

export function PitchingPanel(props: {
  pitching: PlayerPitchingDto | null;
  accent: string;
}) {
  const { pitching, accent } = props;

  if (pitching == null) {
    return <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Loading…</div>;
  }

  const headerCell = (label: string, isFirst = false): React.CSSProperties => ({
    padding: "0.38rem 0.55rem",
    textAlign: isFirst ? "left" : "center",
    fontWeight: 800,
    fontSize: "0.76rem",
    whiteSpace: "nowrap",
    color: "#ffffff",
    background: accent,
  });

  const dataCell = (isLabel = false, highlight = false): React.CSSProperties => ({
    padding: "0.32rem 0.55rem",
    textAlign: isLabel ? "left" : "center",
    fontWeight: isLabel ? 700 : highlight ? 900 : 500,
    fontSize: "0.85rem",
    whiteSpace: "nowrap",
    color: highlight ? accent : isLabel ? "#111827" : "#374151",
  });

  const sectionLabel: React.CSSProperties = {
    fontSize: "0.78rem",
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    color: "#6b7280",
    marginBottom: "0.35rem",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Pitch Arsenal */}
      <div>
        <div style={sectionLabel}>Pitch Arsenal</div>
        {pitching.arsenal.length === 0 ? (
          <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>
            No pitch arsenal data available for this season.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 480 }}>
              <thead>
                <tr>
                  {["Pitch", "Usage%", "Velo", "Spin", "Whiff%", "PutAway%", "Count"].map((h, i) => (
                    <th key={h} style={headerCell(h, i === 0)}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pitching.arsenal.map((row, i) => (
                  <tr key={row.pitchCode} style={{ background: i % 2 === 0 ? "#f9fafb" : "#ffffff" }}>
                    <td style={dataCell(true)}>
                      <span style={{ fontWeight: 800 }}>{row.pitchName}</span>
                      <span style={{ color: "#9ca3af", fontSize: "0.78rem", marginLeft: "0.4rem" }}>
                        {row.pitchCode}
                      </span>
                    </td>
                    <td style={{ ...dataCell(false, true), fontWeight: 900 }}>{pct(row.usage)}</td>
                    <td style={dataCell()}>{vel(row.avgVelocity)}</td>
                    <td style={dataCell()}>{spin(row.avgSpin)}</td>
                    <td style={dataCell()}>{pct(row.whiffPct)}</td>
                    <td style={dataCell()}>{pct(row.putAwayPct)}</td>
                    <td style={dataCell()}>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Leverage Splits */}
      <div>
        <div style={sectionLabel}>Leverage Splits</div>
        {pitching.leverage.length === 0 ? (
          <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>
            No leverage split data available for this season.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }}>
              <thead>
                <tr>
                  {["Situation", "G", "AB", "H", "HR", "RBI", "BB", "K", "AVG", "OBP", "SLG", "OPS"].map(
                    (h, i) => (
                      <th key={h} style={headerCell(h, i === 0)}>
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {pitching.leverage.map((row, i) => (
                  <tr key={row.leverageCode} style={{ background: i % 2 === 0 ? "#f9fafb" : "#ffffff" }}>
                    <td style={dataCell(true)}>{row.label}</td>
                    <td style={dataCell()}>{row.games}</td>
                    <td style={dataCell()}>{row.atBats}</td>
                    <td style={dataCell()}>{row.hits}</td>
                    <td style={dataCell()}>{row.homeRuns}</td>
                    <td style={dataCell()}>{row.rbi}</td>
                    <td style={dataCell()}>{row.baseOnBalls}</td>
                    <td style={dataCell()}>{row.strikeOuts}</td>
                    <td style={{ ...dataCell(false, true) }}>{row.avg}</td>
                    <td style={dataCell()}>{row.obp}</td>
                    <td style={dataCell()}>{row.slg}</td>
                    <td style={{ ...dataCell(), fontWeight: 900 }}>{row.ops}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
