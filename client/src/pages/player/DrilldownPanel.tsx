import { useState } from "react";
import type { PlayerDrilldownDto, GameLogRowDto, CareerRowDto, VsTeamRowDto } from "./playerDrilldown";

type DrillSection = "gamelog" | "career" | "vsteam";

const GAME_LOG_DEFAULT_ROWS = 25;

function fmt(v: number | null | undefined, decimals = 0): string {
  if (v == null) return "—";
  return decimals > 0 ? v.toFixed(decimals) : String(v);
}

function resultChip(row: GameLogRowDto): React.ReactNode {
  if (row.isWin == null) return null;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.38rem",
        borderRadius: 999,
        fontSize: "0.72rem",
        fontWeight: 800,
        background: row.isWin ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.10)",
        color: row.isWin ? "#166534" : "#991b1b",
        border: `1px solid ${row.isWin ? "rgba(5,150,105,0.2)" : "rgba(185,28,28,0.2)"}`,
        marginLeft: "0.35rem",
      }}
    >
      {row.isWin ? "W" : "L"}
    </span>
  );
}

function SectionNav(props: {
  active: DrillSection;
  setActive: (s: DrillSection) => void;
  accent: string;
  showVsTeam: boolean;
}) {
  const { active, setActive, accent, showVsTeam } = props;

  const btn = (label: string, key: DrillSection) => {
    const isActive = active === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => setActive(key)}
        style={{
          padding: "0.25rem 0.7rem",
          borderRadius: 999,
          border: `1px solid ${isActive ? accent : "#e5e7eb"}`,
          background: isActive ? accent : "#fff",
          color: isActive ? "#fff" : "#374151",
          fontSize: "0.8rem",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", gap: "0.45rem", marginBottom: "0.85rem", flexWrap: "wrap" }}>
      {btn("Game Log", "gamelog")}
      {btn("Career", "career")}
      {showVsTeam && btn("vs Team", "vsteam")}
    </div>
  );
}

function GameLogTable(props: { rows: GameLogRowDto[]; isPitcher: boolean; accent: string }) {
  const { rows, isPitcher, accent } = props;
  const [showAll, setShowAll] = useState(false);

  if (rows.length === 0) {
    return <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>No game log data available.</div>;
  }

  const displayed = showAll ? rows : rows.slice(0, GAME_LOG_DEFAULT_ROWS);

  const hdr = (label: string, isFirst = false): React.CSSProperties => ({
    padding: "0.38rem 0.45rem",
    textAlign: isFirst ? "left" : "center",
    fontWeight: 800,
    fontSize: "0.73rem",
    whiteSpace: "nowrap",
    color: "#fff",
    background: accent,
  });

  const cell = (isLabel = false, highlight = false): React.CSSProperties => ({
    padding: "0.28rem 0.45rem",
    textAlign: isLabel ? "left" : "center",
    fontWeight: highlight ? 900 : isLabel ? 600 : 400,
    fontSize: "0.82rem",
    whiteSpace: "nowrap",
    color: highlight ? accent : isLabel ? "#111827" : "#374151",
  });

  const battingCols = ["Date", "Opp", "H/AB", "HR", "RBI", "BB", "K", "AVG"];
  const pitchingCols = ["Date", "Opp", "IP", "ER", "K", "BB", "ERA", "WHIP"];
  const cols = isPitcher ? pitchingCols : battingCols;

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 420 }}>
          <thead>
            <tr>
              {cols.map((c, i) => (
                <th key={c} style={hdr(c, i === 0)}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((row, i) => {
              const dateShort = row.date.slice(5); // "MM-DD"
              const oppLabel = (row.isHome ? "vs " : "@ ") + row.opponent.split(" ").pop();
              return (
                <tr key={`${row.date}-${row.opponentId}`} style={{ background: i % 2 === 0 ? "#f9fafb" : "#fff" }}>
                  <td style={cell(true)}>
                    {dateShort}
                    {resultChip(row)}
                  </td>
                  <td style={cell()}>{oppLabel}</td>
                  {isPitcher ? (
                    <>
                      <td style={cell()}>{row.inningsPitched ?? "—"}</td>
                      <td style={cell()}>{fmt(row.earnedRuns)}</td>
                      <td style={cell()}>{fmt(row.strikeOuts)}</td>
                      <td style={cell()}>{fmt(row.baseOnBalls)}</td>
                      <td style={cell(false, true)}>{row.era ?? "—"}</td>
                      <td style={cell()}>{row.whip ?? "—"}</td>
                    </>
                  ) : (
                    <>
                      <td style={cell(false, true)}>
                        {fmt(row.hits)}-{fmt(row.atBats)}
                      </td>
                      <td style={cell()}>{fmt(row.homeRuns)}</td>
                      <td style={cell()}>{fmt(row.rbi)}</td>
                      <td style={cell()}>{fmt(row.baseOnBalls)}</td>
                      <td style={cell()}>{fmt(row.strikeOuts)}</td>
                      <td style={cell()}>{row.avg ?? "—"}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > GAME_LOG_DEFAULT_ROWS && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          style={{
            marginTop: "0.6rem",
            padding: "0.3rem 0.75rem",
            borderRadius: 999,
            border: `1px solid ${accent}`,
            background: "#fff",
            color: accent,
            fontSize: "0.8rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {showAll ? "Show fewer" : `Show all ${rows.length} games`}
        </button>
      )}
    </div>
  );
}

function CareerTable(props: { rows: CareerRowDto[]; isPitcher: boolean; accent: string }) {
  const { rows, isPitcher, accent } = props;

  if (rows.length === 0) {
    return <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>No career data available.</div>;
  }

  const hdr = (label: string, isFirst = false): React.CSSProperties => ({
    padding: "0.38rem 0.45rem",
    textAlign: isFirst ? "left" : "center",
    fontWeight: 800,
    fontSize: "0.73rem",
    whiteSpace: "nowrap",
    color: "#fff",
    background: accent,
  });

  const cell = (isLabel = false, highlight = false): React.CSSProperties => ({
    padding: "0.28rem 0.45rem",
    textAlign: isLabel ? "left" : "center",
    fontWeight: highlight ? 900 : isLabel ? 600 : 400,
    fontSize: "0.82rem",
    whiteSpace: "nowrap",
    color: highlight ? accent : isLabel ? "#111827" : "#374151",
  });

  const battingCols = ["Year", "Team", "G", "AB", "AVG", "HR", "RBI", "OPS"];
  const pitchingCols = ["Year", "Team", "G", "IP", "ERA", "WHIP", "K", "W-L"];
  const cols = isPitcher ? pitchingCols : battingCols;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 420 }}>
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={c} style={hdr(c, i === 0)}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.season}-${row.team}`} style={{ background: i % 2 === 0 ? "#f9fafb" : "#fff" }}>
              <td style={cell(true)}>{row.season}</td>
              <td style={{ ...cell(), textAlign: "left", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>
                {row.team}
              </td>
              <td style={cell()}>{row.gamesPlayed}</td>
              {isPitcher ? (
                <>
                  <td style={cell()}>{row.inningsPitched ?? "—"}</td>
                  <td style={cell(false, true)}>{row.era ?? "—"}</td>
                  <td style={cell()}>{row.whip ?? "—"}</td>
                  <td style={cell()}>{fmt(row.strikeOuts)}</td>
                  <td style={cell()}>
                    {fmt(row.wins)}-{fmt(row.losses)}
                  </td>
                </>
              ) : (
                <>
                  <td style={cell()}>{fmt(row.atBats)}</td>
                  <td style={cell(false, true)}>{row.avg ?? "—"}</td>
                  <td style={cell()}>{fmt(row.homeRuns)}</td>
                  <td style={cell()}>{fmt(row.rbi)}</td>
                  <td style={{ ...cell(), fontWeight: 900 }}>{row.ops ?? "—"}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VsTeamTable(props: { rows: VsTeamRowDto[]; accent: string }) {
  const { rows, accent } = props;

  if (rows.length === 0) {
    return <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>No vs-team data available.</div>;
  }

  const hdr = (label: string, isFirst = false): React.CSSProperties => ({
    padding: "0.38rem 0.45rem",
    textAlign: isFirst ? "left" : "center",
    fontWeight: 800,
    fontSize: "0.73rem",
    whiteSpace: "nowrap",
    color: "#fff",
    background: accent,
  });

  const cell = (isLabel = false, highlight = false): React.CSSProperties => ({
    padding: "0.28rem 0.45rem",
    textAlign: isLabel ? "left" : "center",
    fontWeight: highlight ? 900 : isLabel ? 600 : 400,
    fontSize: "0.82rem",
    whiteSpace: "nowrap",
    color: highlight ? accent : isLabel ? "#111827" : "#374151",
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 460 }}>
        <thead>
          <tr>
            {["Opponent", "G", "AB", "H", "HR", "RBI", "BB", "K", "AVG", "OPS"].map((c, i) => (
              <th key={c} style={hdr(c, i === 0)}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.opponentId} style={{ background: i % 2 === 0 ? "#f9fafb" : "#fff" }}>
              <td style={cell(true)}>{row.opponent}</td>
              <td style={cell()}>{row.games}</td>
              <td style={cell()}>{row.atBats}</td>
              <td style={cell()}>{row.hits}</td>
              <td style={cell()}>{row.homeRuns}</td>
              <td style={cell()}>{row.rbi}</td>
              <td style={cell()}>{row.baseOnBalls}</td>
              <td style={cell()}>{row.strikeOuts}</td>
              <td style={cell(false, true)}>{row.avg}</td>
              <td style={{ ...cell(), fontWeight: 900 }}>{row.ops}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DrilldownPanel(props: { drilldown: PlayerDrilldownDto | null; accent: string }) {
  const { drilldown, accent } = props;
  const [section, setSection] = useState<DrillSection>("gamelog");

  if (drilldown == null) {
    return <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Loading…</div>;
  }

  const { isPitcher, gameLog, career, vsTeam } = drilldown;

  return (
    <div>
      <SectionNav
        active={section}
        setActive={setSection}
        accent={accent}
        showVsTeam={!isPitcher}
      />

      {section === "gamelog" && (
        <GameLogTable rows={gameLog} isPitcher={isPitcher} accent={accent} />
      )}
      {section === "career" && (
        <CareerTable rows={career} isPitcher={isPitcher} accent={accent} />
      )}
      {section === "vsteam" && !isPitcher && (
        <VsTeamTable rows={vsTeam} accent={accent} />
      )}
    </div>
  );
}
