// client/src/pages/BoxScorePanel.tsx
import type { ReactElement } from "react";
import { useMemo, useState } from "react";

import type {
  BoxScoreDto,
  BatterLineDto,
  PitcherLineDto,
  GameViewDto,
} from "@bitslinger21/baseball-realtime-client";

type Props = {
  box: BoxScoreDto;
  game?: GameViewDto | null;
};

type TeamMetaLike = { logoUrl?: string | null };

type SideKey = "away" | "home";
type ModeKey = "batting" | "pitching";

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

function getLogoUrl(meta: unknown): string | null {
  const anyMeta = meta as TeamMetaLike | null | undefined;
  const url = anyMeta?.logoUrl;
  return typeof url === "string" && url !== "" ? url : null;
}

function safeText(v: unknown, fallback: string): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s !== "" ? s : fallback;
}

function cityFromTeamName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(0, -1).join(" ") : name;
}

function pickAbbr(gameAbbr: unknown, boxAbbr: unknown, fallback: string): string {
  const a = typeof gameAbbr === "string" ? gameAbbr.trim() : "";
  if (a !== "" && a !== "AWY" && a !== "HOM") return a;

  const b = typeof boxAbbr === "string" ? boxAbbr.trim() : "";
  if (b !== "" && b !== "AWY" && b !== "HOM") return b;

  return fallback;
}

function TeamChip({
  label,
  logoUrl,
  size = 18,
}: {
  label: string;
  logoUrl: string | null;
  size?: number;
}): ReactElement {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        minWidth: 0,
      }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${label} logo`}
          width={size}
          height={size}
          style={{ objectFit: "contain", display: "block" }}
          loading="lazy"
        />
      ) : (
        <span style={{ width: size, height: size, display: "inline-block" }} />
      )}
      <span style={{ fontWeight: 700, letterSpacing: "0.04em" }}>{label}</span>
    </span>
  );
}

export function BoxScorePanel({ box, game }: Props): ReactElement {
  const [side, setSide] = useState<SideKey>("away");
  const [mode, setMode] = useState<ModeKey>("batting");
  const [showFooter, setShowFooter] = useState<boolean>(false);

  // Feature flag: keep footer code but hide both the toggle + footer UI by default.
  const footerUiEnabled = false;

  const awayLogoUrl = getLogoUrl((game as any)?.awayTeamMeta);
  const homeLogoUrl = getLogoUrl((game as any)?.homeTeamMeta);

  const awayAbbr = pickAbbr(game?.awayAbbr, box.away?.teamAbbr, "AWY");
  const homeAbbr = pickAbbr(game?.homeAbbr, box.home?.teamAbbr, "HOM");

  // Team NAMES for the top pill
  const awayName = safeText((game as any)?.awayName, awayAbbr);
  const homeName = safeText((game as any)?.homeName, homeAbbr);

  const awayCity = cityFromTeamName(awayName);
  const homeCity = cityFromTeamName(homeName);

  const selectedLogo = side === "away" ? awayLogoUrl : homeLogoUrl;

  const battingRows: readonly BatterLineDto[] = useMemo(() => {
    const rows = side === "away" ? box.away.batting : box.home.batting;
    return [...rows].sort(sortBattingOrder);
  }, [box, side]);

  const pitchingRows: readonly PitcherLineDto[] = useMemo(() => {
    const rows = side === "away" ? box.away.pitching : box.home.pitching;
    return [...rows];
  }, [box, side]);

  return (
    <div className="bs-root">
      <div className="bs-header" style={{ borderBottom: "none" }}>
        <div className="bs-title-row">
          <h3 className="bs-title">Box score</h3>

          {/* top right: TEAM NAMES */}
          <div className="bs-subtitle">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <TeamChip label={awayName} logoUrl={awayLogoUrl} />
              <span style={{ opacity: 0.7 }}>@</span>
              <TeamChip label={homeName} logoUrl={homeLogoUrl} />
            </span>
          </div>
        </div>

        {/* R/H/E always visible */}
        <table className="bs-table" style={{ marginBottom: "0.25rem" }}>
          <thead>
            <tr>
              <th className="bs-th bs-left">Team</th>
              <th className="bs-th bs-right">R</th>
              <th className="bs-th bs-right">H</th>
              <th className="bs-th bs-right">E</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="bs-td bs-left">
                <TeamChip label={awayName} logoUrl={awayLogoUrl} />
              </td>
              <td className="bs-td bs-right">{box.away.linescore.runs}</td>
              <td className="bs-td bs-right">{box.away.linescore.hits}</td>
              <td className="bs-td bs-right">{box.away.linescore.errors}</td>
            </tr>
            <tr>
              <td className="bs-td bs-left">
                <TeamChip label={homeName} logoUrl={homeLogoUrl} />
              </td>
              <td className="bs-td bs-right">{box.home.linescore.runs}</td>
              <td className="bs-td bs-right">{box.home.linescore.hits}</td>
              <td className="bs-td bs-right">{box.home.linescore.errors}</td>
            </tr>
          </tbody>
        </table>

      </div>

      <div className="bs-body">
        <div
          className="bs-controls"
          style={{ marginTop: 0, paddingTop: "0.25rem", paddingBottom: "0.9rem" }}
        >
          {/* Team toggle */}
          <div className="bs-seg" role="group" aria-label="Team">
            <button
              type="button"
              className={`bs-seg-btn ${side === "away" ? "is-active" : ""}`}
              onClick={(): void => setSide("away")}
            >
              {awayAbbr}
            </button>
            <button
              type="button"
              className={`bs-seg-btn ${side === "home" ? "is-active" : ""}`}
              onClick={(): void => setSide("home")}
            >
              {homeAbbr}
            </button>
          </div>

          {/* Mode toggle */}
          <div className="bs-seg" role="group" aria-label="Mode">
            <button
              type="button"
              className={`bs-seg-btn ${mode === "batting" ? "is-active" : ""}`}
              onClick={(): void => setMode("batting")}
            >
              Batting
            </button>
            <button
              type="button"
              className={`bs-seg-btn ${mode === "pitching" ? "is-active" : ""}`}
              onClick={(): void => setMode("pitching")}
            >
              Pitching
            </button>
          </div>

          {/* Optional footer toggle (currently hidden) */}
          {footerUiEnabled && (
            <div className="bs-seg" role="group" aria-label="Footer">
              <button
                type="button"
                className={`bs-seg-btn ${showFooter ? "is-active" : ""}`}
                onClick={(): void => setShowFooter((v) => !v)}
              >
                Footer
              </button>
            </div>
          )}
        </div>

        {/* Selected section header */}
        <h4 className="bs-section-title">
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <TeamChip
              label={side === "away" ? awayCity : homeCity}
              logoUrl={selectedLogo}
            />
            <span>{mode === "batting" ? "Batting" : "Pitching"}</span>
          </span>
        </h4>

        {mode === "batting" ? (
          <BattingTable rows={battingRows} />
        ) : (
          <PitchingTable rows={pitchingRows} />
        )}
      </div>

      {footerUiEnabled && showFooter && (
        <div className="bs-footer">
          <div className="bs-rhe">
            <div className="bs-rhe-row">
              <span className="bs-rhe-team">{awayName}</span>
              <span className="bs-rhe-cell">R {box.away.linescore.runs}</span>
              <span className="bs-rhe-cell">H {box.away.linescore.hits}</span>
              <span className="bs-rhe-cell">E {box.away.linescore.errors}</span>
            </div>
            <div className="bs-rhe-row">
              <span className="bs-rhe-team">{homeName}</span>
              <span className="bs-rhe-cell">R {box.home.linescore.runs}</span>
              <span className="bs-rhe-cell">H {box.home.linescore.hits}</span>
              <span className="bs-rhe-cell">E {box.home.linescore.errors}</span>
            </div>
          </div>
        </div>
      )}
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
        {rows.map((b) => (
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
        {rows.map((p) => (
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
