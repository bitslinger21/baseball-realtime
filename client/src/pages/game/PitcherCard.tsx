import type { ReactElement } from "react";
import type { PitcherLineDto } from "@bitslinger21/baseball-realtime-client";
import type { PlayUpdate } from "../../realtime/types";
import "./PitcherCard.css";

interface PitcherCardProps {
  latest: PlayUpdate | null;
  pitcherLine: PitcherLineDto | null;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function PitcherCard({ latest, pitcherLine }: PitcherCardProps): ReactElement | null {
  if (latest == null) return null;

  const name = latest.pitcherName ?? "—";
  const era = latest.pitcherEra != null ? latest.pitcherEra.toFixed(2) : "—";
  const position = pitcherLine?.position ?? "P";
  const jersey = pitcherLine?.jerseyNumber != null ? `#${pitcherLine.jerseyNumber}` : "";

  const todayIP = pitcherLine?.ip ?? "—";
  const todayH = pitcherLine?.h ?? "—";
  const todayR = pitcherLine?.r ?? "—";
  const todaySO = pitcherLine?.so ?? "—";

  const pitchCount = pitcherLine?.pitches != null
    ? (pitcherLine.pitches as unknown as { value?: number })?.value ?? "—"
    : "—";
  const strikeCount = pitcherLine?.strikes != null
    ? (pitcherLine.strikes as unknown as { value?: number })?.value ?? "—"
    : "—";

  const stats = [
    { label: "Today", value: `${todayIP} IP`, sub: `${todayH} H · ${todayR} R · ${todaySO} K` },
    { label: "Pitches", value: String(pitchCount), sub: strikeCount !== "—" ? `${String(strikeCount)} strikes` : "" },
    { label: "ERA", value: era, sub: "season" },
  ];

  return (
    <div className="card">
      <div className="pitcher-card__eyebrow-bar">
        <span className="pitcher-card__eyebrow">On the mound</span>
      </div>
      <div className="pitcher-card__body">
        {/* Headshot stub */}
        <div className="pitcher-card__headshot">
          <div className="pitcher-card__headshot-band" style={{ background: "#334155" }} />
          <div className="pitcher-card__headshot-initials">{initials(name)}</div>
        </div>

        {/* Name + meta */}
        <div className="pitcher-card__info">
          <span className="pitcher-card__role">Pitching</span>
          <span className="pitcher-card__name">{name}</span>
          <span className="pitcher-card__meta">
            {position}{jersey ? ` · ${jersey}` : ""}
          </span>
        </div>

        {/* Stat blocks */}
        <div className="pitcher-card__stats">
          {stats.map((s) => (
            <div key={s.label} className="pitcher-card__stat-block">
              <span className="pitcher-card__stat-label">{s.label}</span>
              <span className="pitcher-card__stat-value">{s.value}</span>
              {s.sub !== "" && <span className="pitcher-card__stat-sub">{s.sub}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
