import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import type { BoxScoreDto, BatterLineDto } from "@bitslinger21/baseball-realtime-client";
import type { PlayUpdate } from "../../realtime/types";
import type { AtBatState } from "../../components/AtBatCard/atBatTypes";
import { OrderSpot } from "../../components/primitives/OrderSpot";
import { useMatchupStats } from "../../hooks/useMatchupStats";
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

// ── helpers ───────────────────────────────────────────────────────────────────

function slotOf(battingOrder: string | null | undefined): number {
  if (battingOrder == null) return 0;
  const n = parseInt(battingOrder, 10);
  return isNaN(n) ? 0 : Math.floor(n / 100);
}

function subDepthOf(battingOrder: string | null | undefined): number {
  if (battingOrder == null) return 0;
  const n = parseInt(battingOrder, 10);
  return isNaN(n) ? 0 : n % 100;
}

// Returns the *currently active* batter at each slot (last sub if multiple).
function activeLineup(batting: BatterLineDto[]): BatterLineDto[] {
  const map = new Map<number, BatterLineDto>();
  for (const b of batting) {
    const slot = slotOf(b.battingOrder);
    if (slot === 0) continue;
    const existing = map.get(slot);
    if (existing == null || subDepthOf(b.battingOrder) > subDepthOf(existing.battingOrder)) {
      map.set(slot, b);
    }
  }
  // Return sorted 1–9
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([, b]) => b);
}

// Find the two batters due up after the current batter.
function dueUp(batting: BatterLineDto[], currentBatterId: number | null | undefined): [BatterLineDto | null, BatterLineDto | null] {
  const lineup = activeLineup(batting);
  if (lineup.length === 0) return [null, null];

  const idx = currentBatterId != null
    ? lineup.findIndex((b) => b.playerId === currentBatterId)
    : -1;

  const base = idx >= 0 ? idx : 0;
  const onDeck = lineup[(base + 1) % lineup.length] ?? null;
  const inHole = lineup[(base + 2) % lineup.length] ?? null;
  return [onDeck, inHole];
}

// ── component ─────────────────────────────────────────────────────────────────

export interface MatchupContextProps {
  latest: PlayUpdate | null;
  currentAtBat: AtBatState | null;
  completedAtBats: AtBatState[];
  boxScore: BoxScoreDto | null;
  pitcherMlbId?: number | null;
  gameId?: string | null;
}

export function MatchupContext({ latest, completedAtBats, boxScore, pitcherMlbId, gameId }: MatchupContextProps): ReactElement | null {
  const matchup = useMatchupStats(latest?.batterId, pitcherMlbId);

  if (latest == null) return null;

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
