import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import type { GameViewDto, PitcherLineDto } from "@bitslinger21/baseball-realtime-client";
import type { PlayUpdate } from "../../realtime/types";
import { Headshot } from "../../components/primitives/Headshot";
import { formatIP } from "../../utils/formatIP";
import "./PitcherCard.css";

type TeamMeta = { primaryColorHex?: string | null };

function initials(name: string): string {
  return name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

interface PitcherCardProps {
  latest: PlayUpdate | null;
  pitcherLine: PitcherLineDto | null;
  game?: GameViewDto | null;
}

export function PitcherCard({ latest, pitcherLine, game }: PitcherCardProps): ReactElement | null {
  if (latest == null) return null;

  const name = latest.pitcherName ?? "—";
  const era = latest.pitcherEra != null ? latest.pitcherEra.toFixed(2) : "—";
  const position = pitcherLine?.position ?? "P";
  const jersey = pitcherLine?.jerseyNumber != null ? `#${pitcherLine.jerseyNumber}` : "";

  const todayIP = formatIP(pitcherLine?.ip ?? null);
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

  // Pitcher's team is the fielding team (opposite of who's batting)
  const pitcherIsHome = latest.half === "top";
  const pitcherMeta = game != null
    ? (pitcherIsHome
        ? (game.homeTeamMeta as TeamMeta | null)
        : (game.awayTeamMeta as TeamMeta | null))
    : null;
  const pitcherTeamColor = pitcherMeta?.primaryColorHex ?? "#334155";
  const pitcherMlbId = pitcherLine?.playerId ?? null;

  return (
    <div className="card">
      <div className="pitcher-card__eyebrow-bar">
        <span className="pitcher-card__eyebrow">On the mound</span>
      </div>
      <div className="pitcher-card__body">
        <Headshot
          mlbId={pitcherMlbId}
          initials={initials(name)}
          teamColor={pitcherTeamColor}
          size={80}
        />

        <div className="pitcher-card__info">
          <span className="pitcher-card__role">Pitching</span>
          {pitcherMlbId != null
            ? <Link to={`/player/${pitcherMlbId}`} state={{ fromGame: game?.providerGameId }} className="pitcher-card__name player-link">{name}</Link>
            : <span className="pitcher-card__name">{name}</span>
          }
          <span className="pitcher-card__meta">
            {position}{jersey ? ` · ${jersey}` : ""}
          </span>
        </div>

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
