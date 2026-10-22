import { useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import type { GameViewDto } from "@bitslinger21/scorebook-client";
import { playersApi } from "../../api/baseballApiClient";
import { Headshot } from "../../components/primitives/Headshot";
import { TeamDot } from "../../components/primitives/TeamDot";
import { TEAMS } from "../../utils/teams";
import "./ScorecardStartersSidebar.css";

// Scorecard mode before the first pitch (PROMPT_scorecard_transition §2):
// the 280px sidebar shows the two starting pitchers, the game's probables,
// in place of the batter · strip · zone that has nothing to show yet.

interface ProbableInfo {
  mlbId: number | null;
  name: string | null;
  pitchHand: string | null;
}

interface StarterLine {
  hand: string | null;
  era: string | null;
  whip: string | null;
}

type TeamMeta = { primaryColorHex?: string | null };

function initials(name: string): string {
  return name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

// Hand from the probable when the snapshot has it, else the player's bio;
// ERA / WHIP from the season pitching totals.
function useStarterLine(probable: ProbableInfo | null, season: string): StarterLine {
  const mlbId = probable?.mlbId ?? null;
  const snapHand = probable?.pitchHand ?? null;
  const [line, setLine] = useState<StarterLine>({ hand: snapHand, era: null, whip: null });
  useEffect(() => {
    setLine({ hand: snapHand, era: null, whip: null });
    if (mlbId == null) return;
    let alive = true;
    playersApi
      .playersGetPlayerPitching(mlbId, season)
      .then((r) => { if (alive) setLine((l) => ({ ...l, era: r.data.seasonTotals?.era ?? null, whip: r.data.seasonTotals?.whip ?? null })); })
      .catch(() => {});
    if (snapHand == null) {
      fetch(`/api/players/${mlbId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((p: { data?: { people?: Array<{ pitchHand?: { code?: string } }> } } | null) => {
          const code = p?.data?.people?.[0]?.pitchHand?.code ?? null;
          if (alive && code != null) setLine((l) => ({ ...l, hand: code }));
        })
        .catch(() => {});
    }
    return () => { alive = false; };
  }, [mlbId, snapHand, season]);
  return line;
}

function handLabel(code: string | null): string | null {
  if (code === "L") return "LHP";
  if (code === "R") return "RHP";
  return null;
}

function firstPitchLabel(startTimeUtc: string | null | undefined, gameDate: string | null | undefined): string | null {
  const d = startTimeUtc != null ? new Date(startTimeUtc) : null;
  // The viewer's own timezone, unlabelled.
  if (d != null && !Number.isNaN(d.getTime())) {
    return `First pitch ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/i, "")}`;
  }
  // Unknown start time: the date only.
  if (gameDate == null) return null;
  const day = new Date(`${gameDate}T12:00:00Z`);
  return Number.isNaN(day.getTime()) ? null : day.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

interface StarterRowProps {
  game: GameViewDto;
  probable: ProbableInfo | null;
  abbr: string;
  label: "Away" | "Home";
  meta: TeamMeta | null;
  season: string;
  className: string;
}

function StarterRow({ game, probable, abbr, label, meta, season, className }: StarterRowProps): ReactElement {
  const { hand, era, whip } = useStarterLine(probable, season);
  const name = probable?.name ?? null;
  const team = TEAMS[abbr];
  const statParts = [handLabel(hand), era != null ? `ERA ${era}` : null, whip != null ? `WHIP ${whip}` : null].filter((x) => x != null);
  return (
    <div className={`scsp__row ${className}`}>
      {name != null
        ? <Headshot mlbId={probable?.mlbId ?? null} initials={initials(name)} teamColor={meta?.primaryColorHex ?? "var(--color-text-faint)"} size={52} />
        : <span className="scsp__tbd-shot" aria-hidden="true" />}
      <div className="scsp__text">
        <span className="scsp__team">
          {team != null && <TeamDot team={team} size={14} />}
          <span className="scsp__eyebrow">{label} · {abbr}</span>
        </span>
        {name != null && probable?.mlbId != null
          ? <Link to={`/player/${probable.mlbId}`} state={{ fromGame: game.providerGameId }} className="scsp__name player-link" title={name}>{name}</Link>
          : <span className={`scsp__name${name == null ? " scsp__name--tbd" : ""}`}>{name ?? "TBD"}</span>}
        {name != null && statParts.length > 0 && <span className="scsp__line num">{statParts.join(" · ")}</span>}
      </div>
    </div>
  );
}

export function ScorecardStartersSidebar({ game }: { game: GameViewDto }): ReactElement {
  const g = game as unknown as Record<string, unknown>;
  const snap = game.snapshot as Record<string, unknown> | null | undefined;
  const awayProbable = ((g.awayProbable ?? snap?.awayProbable) as ProbableInfo | null | undefined) ?? null;
  const homeProbable = ((g.homeProbable ?? snap?.homeProbable) as ProbableInfo | null | undefined) ?? null;
  const startTimeUtc = game.startTimeUtc as string | null | undefined;
  const season = String(startTimeUtc != null ? new Date(startTimeUtc).getFullYear() : new Date().getFullYear());
  const firstPitch = firstPitchLabel(startTimeUtc, game.gameDate as string | null | undefined);
  return (
    <>
      <div className="scsp__head">
        <span className="scsp__eyebrow">Starting pitchers</span>
        {firstPitch != null && <span className="scsp__first-pitch num">{firstPitch}</span>}
      </div>
      <StarterRow game={game} probable={awayProbable} abbr={game.awayAbbr} label="Away" meta={game.awayTeamMeta as TeamMeta | null} season={season} className="scsp__row--away" />
      <StarterRow game={game} probable={homeProbable} abbr={game.homeAbbr} label="Home" meta={game.homeTeamMeta as TeamMeta | null} season={season} className="scsp__row--home" />
      {/* Under the pitchers, never instead of them (scorecard_pregame_fixes §1). */}
      <div className="scsp__waiting">
        <span className="scsp__waiting-title">Waiting for updates</span>
        <span className="scsp__waiting-sub">The sheet fills in from the first pitch.</span>
      </div>
    </>
  );
}
