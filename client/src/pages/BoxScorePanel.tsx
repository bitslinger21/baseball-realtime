import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import type {
  BoxScoreDto,
  BatterLineDto,
  PitcherLineDto,
} from "@bitslinger21/baseball-realtime-client";

type Props = {
  box: BoxScoreDto;
};

type TeamSide = "away" | "home";
type ViewMode = "batting" | "pitching";

function asText(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return fallback;
}

function sortBattingOrder(a: BatterLineDto, b: BatterLineDto): number {
  const ao = typeof a.battingOrder === "string" ? a.battingOrder : "";
  const bo = typeof b.battingOrder === "string" ? b.battingOrder : "";
  return ao.localeCompare(bo);
}

export function BoxScorePanel({ box }: Props): ReactElement {
  const [team, setTeam] = useState<TeamSide>("away");
  const [view, setView] = useState<ViewMode>("batting");

  const away = box.away;
  const home = box.home;

  const awayBat = useMemo(
    (): readonly BatterLineDto[] => [...away.batting].sort(sortBattingOrder),
    [away.batting],
  );
  const homeBat = useMemo(
    (): readonly BatterLineDto[] => [...home.batting].sort(sortBattingOrder),
    [home.batting],
  );

  const awayPit = useMemo((): readonly PitcherLineDto[] => [...away.pitching], [away.pitching]);
  const homePit = useMemo((): readonly PitcherLineDto[] => [...home.pitching], [home.pitching]);

  const activeAbbr: string = team === "away" ? away.teamAbbr : home.teamAbbr;

  const battingRows: readonly BatterLineDto[] = team === "away" ? awayBat : homeBat;
  const pitchingRows: readonly PitcherLineDto[] = team === "away" ? awayPit : homePit;

  return (
    <div className="bs-root">
      {/* Sticky header */}
      <div className="bs-header">
        <div className="bs-title-row">
          <h3 className="bs-title">Box score</h3>
          <div className="bs-subtitle">{away.teamAbbr} @ {home.teamAbbr}</div>
        </div>

        <div className="bs-controls">
          <div className="bs-seg">
            <button
              type="button"
              className={`bs-seg-btn ${team === "away" ? "is-active" : ""}`}
              onClick={(): void => setTeam("away")}
            >
              Away
            </button>
            <button
              type="button"
              className={`bs-seg-btn ${team === "home" ? "is-active" : ""}`}
              onClick={(): void => setTeam("home")}
            >
              Home
            </button>
          </div>

          <div className="bs-seg">
            <button
              type="button"
              className={`bs-seg-btn ${view === "batting" ? "is-active" : ""}`}
              onClick={(): void => setView("batting")}
            >
              Batting
            </button>
            <button
              type="button"
              className={`bs-seg-btn ${view === "pitching" ? "is-active" : ""}`}
              onClick={(): void => setView("pitching")}
            >
              Pitching
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="bs-body">
        <h4 className="bs-section-title">
          {activeAbbr} {view === "batting" ? "Batting" : "Pitching"}
        </h4>

        {view === "batting" ? (
          <BattingTable rows={battingRows} />
        ) : (
          <PitchingTable rows={pitchingRows} />
        )}
      </div>

      {/* Sticky footer (optional, included) */}
      <div className="bs-footer">
        <div className="bs-rhe">
          <div className="bs-rhe-row">
            <span className="bs-rhe-team">{away.teamAbbr}</span>
            <span className="bs-rhe-cell">R {away.linescore.runs}</span>
            <span className="bs-rhe-cell">H {away.linescore.hits}</span>
            <span className="bs-rhe-cell">E {away.linescore.errors}</span>
          </div>
          <div className="bs-rhe-row">
            <span className="bs-rhe-team">{home.teamAbbr}</span>
            <span className="bs-rhe-cell">R {home.linescore.runs}</span>
            <span className="bs-rhe-cell">H {home.linescore.hits}</span>
            <span className="bs-rhe-cell">E {home.linescore.errors}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BattingTable({ rows }: { rows: readonly BatterLineDto[] }): ReactElement {
  return (
    <table className="bs-table">
      <thead>
        <tr>
          <th className="bs-th bs-left">#</th>
          <th className="bs-th bs-left">Batter</th>
          <th className="bs-th bs-right">AB</th>
          <th className="bs-th bs-right">R</th>
          <th className="bs-th bs-right">H</th>
          <th className="bs-th bs-right">RBI</th>
          <th className="bs-th bs-right">BB</th>
          <th className="bs-th bs-right">SO</th>
          <th className="bs-th bs-right">HR</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((b: BatterLineDto): ReactElement => (
          <tr key={b.playerId}>
            <td className="bs-td bs-left">{asText(b.battingOrder, "")}</td>
            <td className="bs-td bs-left bs-name">{b.name}</td>
            <td className="bs-td bs-right">{b.ab}</td>
            <td className="bs-td bs-right">{b.r}</td>
            <td className="bs-td bs-right">{b.h}</td>
            <td className="bs-td bs-right">{b.rbi}</td>
            <td className="bs-td bs-right">{b.bb}</td>
            <td className="bs-td bs-right">{b.so}</td>
            <td className="bs-td bs-right">{b.hr}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PitchingTable({ rows }: { rows: readonly PitcherLineDto[] }): ReactElement {
  return (
    <table className="bs-table">
      <thead>
        <tr>
          <th className="bs-th bs-left">Pitcher</th>
          <th className="bs-th bs-right">IP</th>
          <th className="bs-th bs-right">H</th>
          <th className="bs-th bs-right">R</th>
          <th className="bs-th bs-right">ER</th>
          <th className="bs-th bs-right">BB</th>
          <th className="bs-th bs-right">SO</th>
          <th className="bs-th bs-right">P</th>
          <th className="bs-th bs-right">S</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p: PitcherLineDto): ReactElement => (
          <tr key={p.playerId}>
            <td className="bs-td bs-left bs-name">{p.name}</td>
            <td className="bs-td bs-right">{p.ip}</td>
            <td className="bs-td bs-right">{p.h}</td>
            <td className="bs-td bs-right">{p.r}</td>
            <td className="bs-td bs-right">{p.er}</td>
            <td className="bs-td bs-right">{p.bb}</td>
            <td className="bs-td bs-right">{p.so}</td>
            <td className="bs-td bs-right">{asText(p.pitches, "")}</td>
            <td className="bs-td bs-right">{asText(p.strikes, "")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}