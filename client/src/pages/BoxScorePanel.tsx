import type { ReactElement } from "react";
import type {
  BoxScoreDto,
  BatterLineDto,
  PitcherLineDto,
} from "@bitslinger21/baseball-realtime-client";

type Props = {
  box: BoxScoreDto;
};

function sortBattingOrder(a: BatterLineDto, b: BatterLineDto): number {
  const ao = typeof a.battingOrder === "string" ? a.battingOrder : "";
  const bo = typeof b.battingOrder === "string" ? b.battingOrder : "";
  return ao.localeCompare(bo);
}

function asText(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return fallback;
}

export function BoxScorePanel({ box }: Props): ReactElement {
  const away = box.away;
  const home = box.home;

  const awayBat = [...away.batting].sort(sortBattingOrder);
  const homeBat = [...home.batting].sort(sortBattingOrder);

  const awayPit = [...away.pitching];
  const homePit = [...home.pitching];

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Box score</h3>

      {/* R / H / E */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0.75rem" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "6px 4px", borderBottom: "1px solid #ddd" }}>Team</th>
            <th style={{ textAlign: "right", padding: "6px 4px", borderBottom: "1px solid #ddd" }}>R</th>
            <th style={{ textAlign: "right", padding: "6px 4px", borderBottom: "1px solid #ddd" }}>H</th>
            <th style={{ textAlign: "right", padding: "6px 4px", borderBottom: "1px solid #ddd" }}>E</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: "6px 4px" }}>{away.teamAbbr}</td>
            <td style={{ padding: "6px 4px", textAlign: "right" }}>{away.linescore.runs}</td>
            <td style={{ padding: "6px 4px", textAlign: "right" }}>{away.linescore.hits}</td>
            <td style={{ padding: "6px 4px", textAlign: "right" }}>{away.linescore.errors}</td>
          </tr>
          <tr>
            <td style={{ padding: "6px 4px" }}>{home.teamAbbr}</td>
            <td style={{ padding: "6px 4px", textAlign: "right" }}>{home.linescore.runs}</td>
            <td style={{ padding: "6px 4px", textAlign: "right" }}>{home.linescore.hits}</td>
            <td style={{ padding: "6px 4px", textAlign: "right" }}>{home.linescore.errors}</td>
          </tr>
        </tbody>
      </table>

      <h4 style={{ margin: "0.5rem 0" }}>{away.teamAbbr} Batting</h4>
      <BattingTable rows={awayBat} />

      <h4 style={{ margin: "0.75rem 0 0.5rem" }}>{home.teamAbbr} Batting</h4>
      <BattingTable rows={homeBat} />

      <h4 style={{ margin: "0.75rem 0 0.5rem" }}>{away.teamAbbr} Pitching</h4>
      <PitchingTable rows={awayPit} />

      <h4 style={{ margin: "0.75rem 0 0.5rem" }}>{home.teamAbbr} Pitching</h4>
      <PitchingTable rows={homePit} />
    </div>
  );
}

function BattingTable({ rows }: { rows: readonly BatterLineDto[] }): ReactElement {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
      <thead>
        <tr>
          <th style={thLeft}>#</th>
          <th style={thLeft}>Batter</th>
          <th style={thRight}>AB</th>
          <th style={thRight}>R</th>
          <th style={thRight}>H</th>
          <th style={thRight}>RBI</th>
          <th style={thRight}>BB</th>
          <th style={thRight}>SO</th>
          <th style={thRight}>HR</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((b) => (
          <tr key={b.playerId}>
            <td style={tdLeft}>{asText(b.battingOrder, "")}</td>
            <td style={tdLeft}>{b.name}</td>
            <td style={tdRight}>{b.ab}</td>
            <td style={tdRight}>{b.r}</td>
            <td style={tdRight}>{b.h}</td>
            <td style={tdRight}>{b.rbi}</td>
            <td style={tdRight}>{b.bb}</td>
            <td style={tdRight}>{b.so}</td>
            <td style={tdRight}>{b.hr}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PitchingTable({ rows }: { rows: readonly PitcherLineDto[] }): ReactElement {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
      <thead>
        <tr>
          <th style={thLeft}>Pitcher</th>
          <th style={thRight}>IP</th>
          <th style={thRight}>H</th>
          <th style={thRight}>R</th>
          <th style={thRight}>ER</th>
          <th style={thRight}>BB</th>
          <th style={thRight}>SO</th>
          <th style={thRight}>P</th>
          <th style={thRight}>S</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.playerId}>
            <td style={tdLeft}>{p.name}</td>
            <td style={tdRight}>{p.ip}</td>
            <td style={tdRight}>{p.h}</td>
            <td style={tdRight}>{p.r}</td>
            <td style={tdRight}>{p.er}</td>
            <td style={tdRight}>{p.bb}</td>
            <td style={tdRight}>{p.so}</td>
            <td style={tdRight}>{asText(p.pitches, "")}</td>
            <td style={tdRight}>{asText(p.strikes, "")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const thLeft = { textAlign: "left" as const, padding: "6px 4px", borderBottom: "1px solid #ddd" };
const thRight = { textAlign: "right" as const, padding: "6px 4px", borderBottom: "1px solid #ddd" };
const tdLeft = { textAlign: "left" as const, padding: "6px 4px", borderBottom: "1px solid #eee" };
const tdRight = { textAlign: "right" as const, padding: "6px 4px", borderBottom: "1px solid #eee" };
