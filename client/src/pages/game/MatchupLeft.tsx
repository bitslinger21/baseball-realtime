import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import type { GameViewDto } from "@bitslinger21/baseball-realtime-client";
import type { PlayUpdate } from "../../realtime/types";
import type { AtBatState } from "../../components/AtBatCard/atBatTypes";
import type { BatterInfo } from "../../components/AtBatCard/atBatTypes";
import { Bases } from "../../components/primitives/Bases";
import { Headshot } from "../../components/primitives/Headshot";
import { Pips } from "../../components/primitives/Pips";
import { Pill } from "../../components/primitives/Pill";
import { StrikeZone } from "../../components/primitives/StrikeZone";
import type { StrikeZoneDot } from "../../components/primitives/StrikeZone";
import "./MatchupLeft.css";

const PITCH_COLORS: Record<string, string> = {
  FF: "#dc2626", FA: "#dc2626",
  SI: "#ea580c", FT: "#ea580c",
  SL: "#0891b2",
  CU: "#3b82f6", KC: "#3b82f6",
  CH: "#16a34a",
  FC: "#a3a3a3",
  SW: "#7c3aed", ST: "#7c3aed",
  FS: "#14b8a6",
  KN: "#f59e0b",
};

function pitchColor(code: string): string {
  return PITCH_COLORS[code.toUpperCase()] ?? "#75706a";
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function pitchToPercent(
  pitchX: number,
  pitchZ: number,
  szTop: number,
  szBottom: number,
): { x: number; y: number } {
  const halfPlate = 0.8333;
  const x = 50 + (pitchX / halfPlate) * 27;
  const zRange = szTop - szBottom;
  const y = zRange > 0 ? 12 + ((szTop - pitchZ) / zRange) * 54 : 39;
  return { x: clamp(x, 6, 94), y: clamp(y, 6, 94) };
}

function resultTone(desc: string): "live" | "positive" | "soft" | "neutral" {
  const d = desc.toLowerCase();
  if (d.includes("ball")) return "live";
  if (d.includes("in play")) return "positive";
  if (d.includes("foul")) return "soft";
  return "neutral";
}


function initials(name: string): string {
  return name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

interface MatchupLeftProps {
  game: GameViewDto;
  latest: PlayUpdate | null;
  currentAtBat: AtBatState | null;
  batterInfo: BatterInfo | null;
  lineupsOpen?: boolean;
  onToggleLineups?: () => void;
}

type TeamMeta = { primaryColorHex?: string | null; logoUrl?: string | null };

export function MatchupLeft({
  game,
  latest,
  currentAtBat,
  batterInfo,
  lineupsOpen = false,
  onToggleLineups,
}: MatchupLeftProps): ReactElement {
  if (latest == null) {
    return (
      <div className="card matchup-left">
        <div className="matchup-left__empty">Waiting for updates…</div>
      </div>
    );
  }

  const { inning, half, balls, strikes, outs, bases, batterName, pitcherName } = latest;

  // Team meta (SDK types it as `object | null`; cast locally)
  const awayMeta = game.awayTeamMeta as TeamMeta | null;
  const homeMeta = game.homeTeamMeta as TeamMeta | null;
  const battingMeta = half === "top" ? awayMeta : homeMeta;
  const battingAbbr = half === "top" ? game.awayAbbr : game.homeAbbr;
  const batterTeamColor = battingMeta?.primaryColorHex ?? "#334155";

  // Build zone dots from current at-bat pitches
  const dots: StrikeZoneDot[] = [];
  if (currentAtBat != null) {
    const szTop = currentAtBat.strikeZoneTop ?? 3.5;
    const szBottom = currentAtBat.strikeZoneBottom ?? 1.5;
    for (const p of currentAtBat.pitches) {
      if (p.pitchX == null || p.pitchZ == null) continue;
      const { x, y } = pitchToPercent(p.pitchX, p.pitchZ, szTop, szBottom);
      dots.push({ x, y, label: p.seq, color: pitchColor(p.pitchTypeCode) });
    }
  }

  // Legend: unique pitch types seen in this AB
  const seenTypes = new Map<string, string>();
  if (currentAtBat != null) {
    for (const p of currentAtBat.pitches) {
      if (!seenTypes.has(p.pitchTypeCode)) seenTypes.set(p.pitchTypeCode, p.pitchTypeName);
    }
  }

  // Last pitch
  const lastPitch = currentAtBat?.pitches[currentAtBat.pitches.length - 1] ?? null;
  const lastPitchName = lastPitch?.pitchTypeName ?? latest.pitchType ?? "—";
  const lastPitchSpeed = lastPitch?.speedMph ?? latest.pitchSpeedMph;
  const lastPitchResult = lastPitch?.result ?? latest.description ?? "—";
  const lastPitchSeq = lastPitch?.seq ?? null;

  // Batter today line
  const gameAB = currentAtBat?.gameAB ?? 0;
  const gameH = currentAtBat?.gameH ?? 0;

  // Slash line from season info
  const avg = batterInfo?.avg ?? "—";
  const obp = batterInfo?.obp ?? "—";
  const slg = batterInfo?.slg ?? "—";

  return (
    <div className="card matchup-left">
      {/* Light play-state eyebrow — inning · bases · B/S/O pips | Lineups ▾ (right) */}
      <div className="matchup-left__eyebrow">
        <div className="matchup-left__eyebrow-left">
          <span className="matchup-left__inning num">
            {half === "top" ? "▲" : "▼"} {inning}
          </span>
          <Bases
            on={[bases.on1, bases.on2, bases.on3]}
            size={26}
            fill="var(--color-accent)"
            empty="var(--color-border)"
          />
          <div className="matchup-left__count-group">
            {(
              [
                { l: "B", count: balls, total: 4, color: "var(--color-info)" },
                { l: "S", count: strikes, total: 3, color: "var(--color-text)" },
                { l: "O", count: outs, total: 3, color: "var(--color-accent)" },
              ] as const
            ).map((p) => (
              <span key={p.l} className="matchup-left__count-item">
                <span className="matchup-left__count-label">{p.l}</span>
                <Pips count={p.count} total={p.total} size={8} gap={4} color={p.color} emptyColor="var(--color-border)" />
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          className={`matchup-left__lineups-btn${lineupsOpen ? " matchup-left__lineups-btn--open" : ""}`}
          onClick={onToggleLineups}
        >
          Lineups <span className="matchup-left__lineups-arrow">{lineupsOpen ? "▸" : "▾"}</span>
        </button>
      </div>

      {/* Zone + batter grid */}
      <div className="matchup-left__grid">
        {/* Zone column */}
        <div className="matchup-left__zone-col">
          <StrikeZone size={240} dots={dots} />
          {seenTypes.size > 0 && (
            <div className="matchup-left__legend">
              {Array.from(seenTypes).map(([code, name]) => (
                <span key={code} className="matchup-left__legend-item">
                  <span
                    className="matchup-left__legend-dot"
                    style={{ background: pitchColor(code) }}
                  />
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Batter column */}
        <div className="matchup-left__batter-col">
          <span className="matchup-left__at-bat-eyebrow">At bat · {battingAbbr}</span>

          <div className="matchup-left__batter-identity">
            <Headshot
              mlbId={latest.batterId ?? null}
              initials={initials(batterName ?? "—")}
              teamColor={batterTeamColor}
              size={68}
            />
            <div className="matchup-left__batter-text">
              {latest.batterId != null
                ? <Link to={`/player/${latest.batterId}`} state={{ fromGame: game.providerGameId }} className="matchup-left__batter-name player-link">{batterName ?? "—"}</Link>
                : <span className="matchup-left__batter-name">{batterName ?? "—"}</span>
              }
              {latest.batterAvg != null && (
                <span className="matchup-left__batter-meta">
                  .{String(Math.round(latest.batterAvg * 1000)).padStart(3, "0")} AVG
                </span>
              )}
              {batterInfo != null && (
                <span className="matchup-left__slash">
                  {avg}
                  <span className="matchup-left__slash-sep"> / </span>
                  {obp}
                  <span className="matchup-left__slash-sep"> / </span>
                  {slg}
                </span>
              )}
            </div>
          </div>

          <div className="matchup-left__stat-rows">
            <div className="matchup-left__stat-row">
              <span className="matchup-left__stat-row-label">Today</span>
              <span className="matchup-left__stat-row-value">
                {gameH}-for-{gameAB}
              </span>
            </div>
            {pitcherName != null && (
              <div className="matchup-left__stat-row">
                <span className="matchup-left__stat-row-label">
                  vs {pitcherName.split(" ").slice(-1)[0]}
                </span>
                <span className="matchup-left__stat-row-value matchup-left__stat-row-value--faint">
                  —
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Last-pitch dark panel */}
      <div className="matchup-left__last-pitch-wrap">
        <div className="matchup-left__last-pitch">
          <div>
            <div className="matchup-left__lp-eyebrow">
              Last pitch{lastPitchSeq != null ? ` · #${lastPitchSeq} of at-bat` : ""}
            </div>
            <div className="matchup-left__lp-name">{lastPitchName}</div>
          </div>

          <div className="matchup-left__lp-velo-block">
            <div className="matchup-left__lp-velo">
              {lastPitchSpeed != null ? Math.round(lastPitchSpeed) : "—"}
            </div>
            <div className="matchup-left__lp-velo-unit">MPH</div>
          </div>

          <div className="matchup-left__lp-result">
            <Pill tone={resultTone(lastPitchResult)}>
              {lastPitchResult.split(",")[0].split("(")[0].trim() || "—"}
            </Pill>
            {lastPitchResult.includes(",") && (
              <span className="matchup-left__lp-desc">
                {lastPitchResult.split(",").slice(1).join(",").trim()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
