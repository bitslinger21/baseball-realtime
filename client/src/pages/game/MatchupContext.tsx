import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import type { BoxScoreDto, PitcherLineDto, GameViewDto } from "@bitslinger21/baseball-realtime-client";
import type { PlayUpdate } from "../../realtime/types";
import type { AtBatState } from "../../components/AtBatCard/atBatTypes";
import { OrderSpot } from "../../components/primitives/OrderSpot";
import { Headshot } from "../../components/primitives/Headshot";
import { formatIP } from "../../utils/formatIP";
import { useMatchupStats } from "../../hooks/useMatchupStats";
import { dueUp, slotOf } from "./lineupUtils";
import "./MatchupContext.css";

const MC_HIT_RESULTS = new Set(['Single', 'Double', 'Triple', 'HomeRun']);
const MC_NON_AB_RESULTS = new Set(['Walk', 'IntentionalWalk', 'HitByPitch', 'SacFly', 'SacBunt']);

function batterStatsFromABs(
  completedAtBats: AtBatState[],
  batterId: number,
): { h: number; ab: number } {
  const batterABs = completedAtBats.filter(ab => ab.batterId === batterId && ab.result != null);
  return {
    h: batterABs.filter(ab => MC_HIT_RESULTS.has(ab.result ?? '')).length,
    ab: batterABs.filter(ab => !MC_NON_AB_RESULTS.has(ab.result ?? '')).length,
  };
}

// ── component ─────────────────────────────────────────────────────────────────

export interface MatchupContextProps {
  latest: PlayUpdate | null;
  currentAtBat: AtBatState | null;
  completedAtBats: AtBatState[];
  boxScore: BoxScoreDto | null;
  pitcherMlbId?: number | null;
  gameId?: string | null;
  pitcherLine?: PitcherLineDto | null;
  game?: GameViewDto | null;
  scoutLine?: { ip: string; h: number; r: number; so: number } | null;
}

type TeamMeta = { primaryColorHex?: string | null };

export function MatchupContext({ latest, completedAtBats, boxScore, pitcherMlbId, gameId, pitcherLine, game, scoutLine }: MatchupContextProps): ReactElement | null {
  const matchup = useMatchupStats(latest?.batterId, pitcherMlbId);

  if (latest == null) return null;

  // Pitcher strip data
  const pitcherIsHome = latest.half === "top";
  const pitcherTeamAbbr = pitcherIsHome ? (game?.homeAbbr ?? "") : (game?.awayAbbr ?? "");
  const pitcherTeamMeta = pitcherIsHome
    ? (game?.homeTeamMeta as TeamMeta | null)
    : (game?.awayTeamMeta as TeamMeta | null);
  const pitcherTeamColor = pitcherTeamMeta?.primaryColorHex ?? "var(--color-text-faint)";
  const stripName = pitcherLine?.name ?? latest.pitcherName ?? "—";
  const stripInitials = stripName.split(" ").map((w: string) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
  const stripIP = scoutLine != null ? scoutLine.ip : formatIP(pitcherLine?.ip ?? null);
  const stripH = scoutLine != null ? scoutLine.h : (pitcherLine?.h ?? 0);
  const stripR = scoutLine != null ? scoutLine.r : (pitcherLine?.r ?? 0);
  const stripSO = scoutLine != null ? scoutLine.so : (pitcherLine?.so ?? 0);
  const stripBB = pitcherLine?.bb ?? 0;
  const stripPitchCount = pitcherLine?.pitches != null
    ? (pitcherLine.pitches as unknown as { value?: number })?.value ?? "—"
    : "—";
  const stripEra = latest.pitcherEra != null ? latest.pitcherEra.toFixed(2) : "—";

  const batterName = latest.batterName ?? "—";
  const pitcherName = latest.pitcherName ?? "—";
  const batterLastName = batterName.split(" ").slice(-1)[0];
  const pitcherLastName = pitcherName.split(" ").slice(-1)[0];

  // Derive "Today" stats from completed at-bats (accurate at any play-head position).
  const currentBatterStats = latest.batterId != null
    ? batterStatsFromABs(completedAtBats, latest.batterId)
    : { h: 0, ab: 0 };
  const todayLine = `${currentBatterStats.h}-for-${currentBatterStats.ab}`;

  // Which side is batting
  const isBattingHome = latest.half === "bottom";
  const battingSide = isBattingHome ? boxScore?.home : boxScore?.away;
  const batting = battingSide?.batting ?? [];

  const [onDeck, inHole] = dueUp(batting, latest.batterId);

  // Derive on-deck/in-hole stats from completed at-bats (accurate at any play-head position).
  const onDeckStats = onDeck != null ? batterStatsFromABs(completedAtBats, onDeck.playerId) : null;
  const inHoleStats = inHole != null ? batterStatsFromABs(completedAtBats, inHole.playerId) : null;

  return (
    <div className="card mc">
      {pitcherLine != null && (
        <div className="mc__pitcher-strip">
          <Headshot
            mlbId={pitcherLine.playerId}
            initials={stripInitials}
            teamColor={pitcherTeamColor}
            size={30}
            ratio={1.15}
          />
          <div className="mc__ps-info">
            <span className="mc__ps-eyebrow">Pitching · {pitcherTeamAbbr}</span>
            <div className="mc__ps-name-row">
              {pitcherLine.playerId != null
                ? <Link to={`/player/${pitcherLine.playerId}`} state={{ fromGame: gameId ?? undefined }} className="mc__ps-name player-link">{stripName}</Link>
                : <span className="mc__ps-name">{stripName}</span>
              }
              <span className="mc__ps-hand num">{pitcherLine.handedness ?? pitcherLine.position ?? "P"} · #{pitcherLine.jerseyNumber ?? "—"}</span>
            </div>
          </div>
          <div className="mc__ps-stats">
            <div className="mc__ps-line1 num">
              <span className="mc__ps-val">{stripIP}</span>
              <span className="mc__ps-unit"> IP</span>
              {"  "}
              {stripH} <span className="mc__ps-unit">H</span>
              <span className="mc__ps-dot"> · </span>
              {stripR} <span className="mc__ps-unit">R</span>
              <span className="mc__ps-dot"> · </span>
              {stripSO} <span className="mc__ps-unit">K</span>
              <span className="mc__ps-dot"> · </span>
              {stripBB} <span className="mc__ps-unit">BB</span>
            </div>
            <div className="mc__ps-line2 num">
              {stripPitchCount} <span className="mc__ps-unit">P</span>
              <span className="mc__ps-dot"> · </span>
              <span className="mc__ps-unit">ERA </span>{stripEra}
              <span className="mc__ps-dot"> · </span>
              <span className="mc__ps-unit">WHIP </span>{pitcherLine.whip ?? "—"}
            </div>
          </div>
        </div>
      )}
      <div className="mc__grid">
        {/* Left — head-to-head */}
        <div className="mc__matchup">
          <span className="mc__eyebrow">This matchup</span>
          <div className="mc__vs-line">
            {latest.batterId != null
              ? <Link to={`/player/${latest.batterId}`} state={{ fromGame: gameId ?? undefined }} className="mc__player-name player-link">{batterLastName}</Link>
              : <span className="mc__player-name">{batterLastName}</span>
            }
            <span className="mc__vs">vs</span>
            {pitcherMlbId != null
              ? <Link to={`/player/${pitcherMlbId}`} state={{ fromGame: gameId ?? undefined }} className="mc__player-name player-link">{pitcherLastName}</Link>
              : <span className="mc__player-name">{pitcherLastName}</span>
            }
          </div>
          <div className="mc__stat-rows">
            <div className="mc__stat-row">
              <span className="mc__stat-label">Today</span>
              <span className="mc__stat-value num">{todayLine}</span>
            </div>
            <div className="mc__stat-row">
              <span className="mc__stat-label">Career</span>
              <span className="mc__stat-value num">
                {matchup != null && matchup.ab > 0
                  ? `${matchup.h}-${matchup.ab}${matchup.avg ? ` · ${matchup.avg}` : ""}${matchup.hr > 0 ? ` · ${matchup.hr} HR` : ""}`
                  : <span className="mc__stat-value--faint">—</span>
                }
              </span>
            </div>
          </div>
        </div>

        {/* Right — due up */}
        <div className="mc__due-up">
          <span className="mc__eyebrow">Due up</span>
          {onDeck != null && (
            <div className="mc__due-player">
              <span className="mc__due-label">On deck</span>
              <div className="mc__due-row">
                {slotOf(onDeck.battingOrder) > 0 && <OrderSpot n={slotOf(onDeck.battingOrder)} />}
                <span className="mc__jersey num">#{onDeck.jerseyNumber ?? "—"}</span>
                <Link to={`/player/${onDeck.playerId}`} state={{ fromGame: gameId ?? undefined }} className="mc__due-name player-link">{onDeck.name}</Link>
                <span className="mc__due-pos">– {onDeck.position ?? "—"}</span>
                <span className="mc__due-line num">{onDeckStats?.h ?? 0}-{onDeckStats?.ab ?? 0}</span>
              </div>
            </div>
          )}
          {inHole != null && (
            <div className="mc__due-player">
              <span className="mc__due-label">In the hole</span>
              <div className="mc__due-row">
                {slotOf(inHole.battingOrder) > 0 && <OrderSpot n={slotOf(inHole.battingOrder)} />}
                <span className="mc__jersey num">#{inHole.jerseyNumber ?? "—"}</span>
                <Link to={`/player/${inHole.playerId}`} state={{ fromGame: gameId ?? undefined }} className="mc__due-name player-link">{inHole.name}</Link>
                <span className="mc__due-pos">– {inHole.position ?? "—"}</span>
                <span className="mc__due-line num">{inHoleStats?.h ?? 0}-{inHoleStats?.ab ?? 0}</span>
              </div>
            </div>
          )}
          {onDeck == null && inHole == null && (
            <span className="mc__empty">Waiting for lineup…</span>
          )}
        </div>
      </div>
    </div>
  );
}
