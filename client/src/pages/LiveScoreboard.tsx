import { GameDto } from "@bitslinger21/baseball-realtime-client";
import { PlayUpdate } from "../realtime/types";
import { ReactElement } from "react";

// Format "Firstname Lastname" or "Firstname M. Lastname" as "F. Lastname"
function formatInitialLast(name?: string | null): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return name;
  const last = parts[parts.length - 1];
  const first = parts[0];
  if (!first) return last;
  return `${first[0]}. ${last}`;
}

function formatBattingAvg(avg?: number | null): string | null {
  if (avg == null || Number.isNaN(avg)) return null;
  // Always show three digits after decimal, no leading zero
  return avg >= 1 || avg < 0
    ? avg.toFixed(3)
    : `.${Math.round(avg * 1000).toString().padStart(3, "0")}`;
}

function formatEra(era?: number | null): string | null {
  if (era == null || Number.isNaN(era)) return null;
  return era.toFixed(2);
}

type TeamMetaLike = {
  logoUrl?: string | null;
  primaryColorHex?: string | null;
  alternateColorHex?: string | null;
  abbr?: string | null;
  displayName?: string | null;
};

export function LiveScoreboard(props: {
  game: GameDto;
  update: PlayUpdate;
}): ReactElement {
  const { game, update } = props;

  const awayMeta: TeamMetaLike | null =
    (game as unknown as { awayTeamMeta?: TeamMetaLike | null }).awayTeamMeta ??
    null;
  const homeMeta: TeamMetaLike | null =
    (game as unknown as { homeTeamMeta?: TeamMetaLike | null }).homeTeamMeta ??
    null;

  const awayLogo = awayMeta?.logoUrl ?? null;
  const homeLogo = homeMeta?.logoUrl ?? null;

  const awayColor = awayMeta?.primaryColorHex ?? null;
  const homeColor = homeMeta?.primaryColorHex ?? null;

  const awayAbbr = game.awayAbbr ?? "AWY";
  const homeAbbr = game.homeAbbr ?? "HOM";

  const caret = update.half === "top" ? "▲" : "▼";

  type PlayUpdateWithStats = PlayUpdate & {
    batterAvg?: number | null;
    pitcherEra?: number | null;
  };

  const u: PlayUpdateWithStats = update;
  const isTop: boolean = update.half === "top";

  const batterName: string | null = formatInitialLast(update.batterName);
  const pitcherName: string | null = formatInitialLast(update.pitcherName);

  const batterAvgText: string | null = formatBattingAvg(u.batterAvg ?? null);
  const pitcherEraText: string | null = formatEra(u.pitcherEra ?? null);

  const awayName: string | null = isTop ? batterName : pitcherName;
  const homeName: string | null = isTop ? pitcherName : batterName;

  const awayStat: string | null = isTop ? batterAvgText : pitcherEraText;
  const homeStat: string | null = isTop ? pitcherEraText : batterAvgText;

  // Add booleans for batter/pitcher role
  const awayIsBatter: boolean = isTop;
  const homeIsBatter: boolean = !isTop;

  return (
    <div>
      <div className="lf-board">
        {/* Left: away score block */}
        <ScoreBlock
          side="away"
          logoUrl={awayLogo}
          abbr={awayAbbr}
          score={update.awayScore}
          primaryColorHex={awayColor}
        />

        {/* Center: game state */}
        <div className="lf-center">
          <div className="lf-center-row lf-center-row--top">
            <span className="lf-inning">
              <span
                className="lf-caret"
                aria-label={update.half === "top" ? "Top" : "Bottom"}
              >
                {caret}
              </span>{" "}
              <span className="lf-inning-num">{update.inning}</span>
            </span>
          </div>

          {/* ✅ REPLACE your mid row with THIS */}
          <div className="lf-center-row lf-center-row--mid">
            <div className="lf-bso-dots" aria-label="Balls, strikes, outs">
              <DotRow count={update.balls} max={4} />
              <DotRow count={update.strikes} max={3} />
              <DotRow count={update.outs} max={3} />
            </div>
          </div>

          <div
            className="lf-center-row lf-center-row--bases"
            aria-label="Runners on base"
          >
            <BasesTriplet on1={update.bases.on1} on2={update.bases.on2} on3={update.bases.on3} />
          </div>
        </div>

        {/* Right: home score block */}
        <ScoreBlock
          side="home"
          logoUrl={homeLogo}
          abbr={homeAbbr}
          score={update.homeScore}
          primaryColorHex={homeColor}
        />
      </div>

      {/* New row under the scorebug */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "110px 1fr 110px",
          gap: 8,
          marginTop: 6,
          padding: "0 8px",
          alignItems: "start",
        }}
      >
        {/* LEFT: away */}
        <div style={{ textAlign: "center", minWidth: 0 }}>
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: 700,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {awayName ?? "—"}
          </div>
          <div style={{ fontSize: "0.75rem", opacity: 0.85, fontVariantNumeric: "tabular-nums" }}>
            {awayIsBatter ? (awayStat ? `${awayStat} AVG` : "") : (awayStat ? `${awayStat} ERA` : "")}
          </div>
        </div>

        {/* MIDDLE: pitch info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            minWidth: 0,
            lineHeight: 1.1,
          }}
        >
          <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>
            {update.pitchType ?? "—"}
          </div>
          <div style={{ fontSize: "0.75rem", opacity: 0.8, fontVariantNumeric: "tabular-nums" }}>
            {update.pitchSpeedMph != null ? `${Math.round(update.pitchSpeedMph)} mph` : "—"}
          </div>
        </div>

        {/* RIGHT: home */}
        <div style={{ textAlign: "center", minWidth: 0 }}>
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: 700,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {homeName ?? "—"}
          </div>
          <div style={{ fontSize: "0.75rem", opacity: 0.85, fontVariantNumeric: "tabular-nums" }}>
            {homeIsBatter ? (homeStat ? `${homeStat} AVG` : "") : (homeStat ? `${homeStat} ERA` : "")}
          </div>
        </div>
      </div>
    </div>
  );
}


function DotRow(props: { count: number; max: number }): ReactElement {
  const { count, max } = props;

  const safeCount = Math.max(0, Math.min(count, max));

  return (
    <div className="lf-dot-row">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`lf-dot ${i < safeCount ? "is-on" : ""}`} />
      ))}
    </div>
  );
}


function ScoreBlock(props: {
  side: "away" | "home";
  logoUrl: string | null;
  abbr: string;
  score: number;
  primaryColorHex: string | null;
}): ReactElement {
  const { side, logoUrl, abbr, score } = props;

  const style = { backgroundColor: "#ffffff" } as const;

  return (
    <div className={`lf-score-block lf-score-block--${side}`} style={style}>
      {logoUrl ? (
        <img
          className="lf-score-watermark"
          src={logoUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
        />
      ) : null}

      <div className="lf-score-content">
        <div className="lf-team-abbr">{abbr}</div>
        <div className="lf-team-score">{score}</div>
      </div>
    </div>
  );
}

function BasesTriplet(props: {
  on1: boolean;
  on2: boolean;
  on3: boolean;
}): ReactElement {
  const { on1, on2, on3 } = props;

  return (
    <div className="lf-bases-triplet">
      <span className={`lf-base-diamond ${on1 ? "is-on" : ""}`} aria-label="Runner on first" />
      <span
        className={`lf-base-diamond lf-base-diamond--raised ${on2 ? "is-on" : ""}`}
        aria-label="Runner on second"
      />
      <span className={`lf-base-diamond ${on3 ? "is-on" : ""}`} aria-label="Runner on third" />
    </div>
  );
}
