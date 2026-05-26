import type { ReactElement } from "react";
import type { GameViewDto } from "@bitslinger21/baseball-realtime-client";
import type { PlayUpdate } from "../../realtime/types";
import type { AtBatState } from "../../components/AtBatCard/atBatTypes";
import { StrikeZone } from "../../components/primitives/StrikeZone";
import type { StrikeZoneDot } from "../../components/primitives/StrikeZone";
import { LivePill } from "../../components/primitives/Pill";
import { Pill } from "../../components/primitives/Pill";
import { StatBlock } from "../../components/primitives/Stat";
import "./PitchHero.css";

const PITCH_COLORS: Record<string, string> = {
  FF: "#dc2626",
  FA: "#dc2626",
  SI: "#ea580c",
  FT: "#ea580c",
  SL: "#0891b2",
  CU: "#3b82f6",
  KC: "#3b82f6",
  CH: "#16a34a",
  FC: "#a3a3a3",
  SW: "#7c3aed",
  ST: "#7c3aed",
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
  // Zone box occupies x: 8%..92%, y: 8%..78% of the StrikeZone container.
  // pitchX ±0.835 ft maps to the zone edges; pitch outside is clamped to container.
  const x = clamp(50 + (pitchX / 0.835) * 42, 2, 98);
  const zRange = szTop - szBottom;
  const y = zRange > 0
    ? clamp(8 + ((szTop - pitchZ) / zRange) * 70, 2, 90)
    : 43;
  return { x, y };
}

function resultTone(description: string | undefined): "live" | "positive" | "neutral" {
  if (!description) return "neutral";
  const d = description.toLowerCase();
  if (d.includes("ball") || d.includes("hit by pitch")) return "live";
  if (d.includes("in play") || d.includes("single") || d.includes("double") ||
      d.includes("triple") || d.includes("home run")) return "positive";
  return "neutral";
}

interface PitchHeroProps {
  game: GameViewDto;
  latest: PlayUpdate | null;
  currentAtBat: AtBatState | null;
}

export function PitchHero({ game, latest, currentAtBat }: PitchHeroProps): ReactElement {
  const szTop = currentAtBat?.strikeZoneTop ?? latest?.strikeZoneTop ?? 3.5;
  const szBottom = currentAtBat?.strikeZoneBottom ?? latest?.strikeZoneBottom ?? 1.5;

  const dots: StrikeZoneDot[] = (currentAtBat?.pitches ?? [])
    .filter((p) => p.pitchX != null && p.pitchZ != null)
    .map((p) => {
      const { x, y } = pitchToPercent(p.pitchX!, p.pitchZ!, szTop, szBottom);
      return { x, y, label: p.seq, color: pitchColor(p.pitchTypeCode) };
    });

  const inningLabel = latest != null
    ? `${latest.half === "top" ? "Top" : "Bot"} ${latest.inning} · ${latest.outs} out${latest.outs !== 1 ? "s" : ""}`
    : null;

  const lastPitch = currentAtBat?.pitches[currentAtBat.pitches.length - 1] ?? null;
  const tone = resultTone(lastPitch?.result);

  const todayAB = currentAtBat?.gameAB ?? 0;
  const todayH = currentAtBat?.gameH ?? 0;

  return (
    <div className="pitch-hero">
      <div className="pitch-hero__header">
        <span className="pitch-hero__eyebrow">
          {inningLabel != null
            ? `Current at-bat · ${inningLabel}`
            : "Current at-bat"}
        </span>
        {latest != null && <LivePill />}
      </div>

      <div className="pitch-hero__body">
        <div className="pitch-hero__zone-col">
          <StrikeZone size={220} dots={dots} />
          {dots.length > 0 && (
            <div className="pitch-hero__legend">
              {currentAtBat?.pitches
                .filter((p) => p.pitchX != null)
                .map((p) => (
                  <span key={p.seq} className="pitch-hero__legend-item">
                    <span
                      className="pitch-hero__legend-dot"
                      style={{ background: pitchColor(p.pitchTypeCode) }}
                    >
                      {p.seq}
                    </span>
                    {p.pitchTypeName}
                  </span>
                ))}
            </div>
          )}
        </div>

        <div className="pitch-hero__info-col">
          <div className="pitch-hero__matchup">
            <div className="pitch-hero__player">
              <div className="pitch-hero__avatar">{game.awayAbbr}</div>
              <div>
                <span className="pitch-hero__player-eyebrow">Pitching · {game.awayAbbr}</span>
                <div className="pitch-hero__player-name">{latest?.pitcherName ?? "—"}</div>
                <div className="pitch-hero__player-sub num">
                  {latest?.pitcherEra != null ? `${latest.pitcherEra.toFixed(2)} ERA` : "—"}
                </div>
              </div>
            </div>
            <div className="pitch-hero__vs">vs</div>
            <div className="pitch-hero__player pitch-hero__player--right">
              <div style={{ textAlign: "right" }}>
                <span className="pitch-hero__player-eyebrow">At bat · {game.homeAbbr}</span>
                <div className="pitch-hero__player-name">{latest?.batterName ?? "—"}</div>
                <div className="pitch-hero__player-sub num">
                  {latest?.batterAvg != null ? `.${String(Math.round(latest.batterAvg * 1000)).padStart(3, "0")}` : "—"}
                </div>
              </div>
              <div className="pitch-hero__avatar">{game.homeAbbr}</div>
            </div>
          </div>

          {lastPitch != null && (
            <div className="pitch-hero__last-pitch">
              <div>
                <div className="pitch-hero__lp-eyebrow">Last pitch · #{lastPitch.seq} of at-bat</div>
                <div className="pitch-hero__lp-type">{lastPitch.pitchTypeName}</div>
              </div>
              {lastPitch.speedMph != null && (
                <div className="pitch-hero__lp-speed">
                  <span className="pitch-hero__lp-mph num">{Math.round(lastPitch.speedMph)}</span>
                  <span className="pitch-hero__lp-mph-label">MPH</span>
                </div>
              )}
              <div className="pitch-hero__lp-result">
                <Pill
                  tone={tone === "live" ? "live" : tone === "positive" ? "positive" : "neutral"}
                  style={{ fontSize: 12, padding: "5px 12px" }}
                >
                  {lastPitch.result || "—"}
                </Pill>
                <div className="pitch-hero__lp-count num">Count → {lastPitch.count}</div>
              </div>
            </div>
          )}

          <div className="pitch-hero__stats">
            <StatBlock
              label="Today"
              value={`${todayH}-for-${todayAB}`}
              size="sm"
            />
            <StatBlock
              label="Pitcher ERA"
              value={latest?.pitcherEra != null ? latest.pitcherEra.toFixed(2) : "—"}
              size="sm"
            />
            <StatBlock
              label="Balls"
              value={String(latest?.balls ?? 0)}
              sub={`of 3`}
              size="sm"
            />
            <StatBlock
              label="Strikes"
              value={String(latest?.strikes ?? 0)}
              sub={`of 2`}
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
