import type { BoxScoreDto, BoxScoreSideDto } from "@bitslinger21/baseball-realtime-client";
import type { PlayUpdate } from "../../realtime/types";
import type { AtBatState } from "../../components/AtBatCard/atBatTypes";
import { activeLineup, batterTodayLine, slotOf } from "./lineupUtils";

// MLB's live feed only emits a new play once the leadoff batter of the next
// half-inning sees a pitch — there's a real gap between the 3rd out and that
// first pitch where nothing new arrives over the socket. The poller now
// derives `outs` for the play that ends a half-inning from that play's
// runners[].movement.outNumber (the pitch-level count is pre-pitch and never
// reaches 3), so `latest.outs === 3` is a reliable signal of that gap.

export function isHalfInningTransition(latest: PlayUpdate | null): boolean {
  return latest != null && latest.outs === 3;
}

export interface DueUpBatter {
  batterId: number;
  batterName: string;
  battingOrderSlot: number;
  position: string | null;
  todayH: number;
  todayAB: number;
}

export interface DueUpNext {
  teamAbbr: string;
  incomingHalf: "top" | "bottom";
  incomingInning: number;
  batters: DueUpBatter[]; // up to 3, in batting order, next-up first
}

const DUE_UP_COUNT = 3;

export function deriveDueUpNext(
  latest: PlayUpdate,
  boxScore: BoxScoreDto,
  replayUpdates: readonly PlayUpdate[],
  completedAtBats: readonly AtBatState[],
  teamAbbrs: { homeAbbr: string; awayAbbr: string },
): DueUpNext | null {
  const wasTop = latest.half === "top";
  const nextBattingSide: BoxScoreSideDto = wasTop ? boxScore.home : boxScore.away;
  const teamAbbr = wasTop ? teamAbbrs.homeAbbr : teamAbbrs.awayAbbr;
  const incomingHalf: "top" | "bottom" = wasTop ? "bottom" : "top";
  const incomingInning = wasTop ? latest.inning : latest.inning + 1;

  const lineup = activeLineup(nextBattingSide.batting);
  if (lineup.length === 0) return null;

  // Anchor on whoever last batted for the incoming team — batting order is a
  // strict cycle, so "next slot after their last hitter" is always correct,
  // independent of how many innings have passed.
  const battingIds = new Set(nextBattingSide.batting.map((b) => b.playerId));
  let lastBatterId: number | null = null;
  for (let i = replayUpdates.length - 1; i >= 0; i--) {
    const id = replayUpdates[i]?.batterId;
    if (id != null && battingIds.has(id)) {
      lastBatterId = id;
      break;
    }
  }

  const idx = lastBatterId != null ? lineup.findIndex((b) => b.playerId === lastBatterId) : -1;
  const batters: DueUpBatter[] = [];
  for (let i = 1; i <= Math.min(DUE_UP_COUNT, lineup.length); i++) {
    const b = lineup[(idx + i + lineup.length) % lineup.length];
    if (b == null) continue;
    const today = batterTodayLine(completedAtBats, b.playerId);
    batters.push({
      batterId: b.playerId,
      batterName: b.name,
      battingOrderSlot: slotOf(b.battingOrder),
      position: b.position ?? null,
      todayH: today.h,
      todayAB: today.ab,
    });
  }
  if (batters.length === 0) return null;

  return { teamAbbr, incomingHalf, incomingInning, batters };
}

export interface HalfJustEnded {
  result: string; // "Retired in order" | "Scoreless" | "N run(s) scored"
  runs: number;
  hits: number;
  walks: number;
  pitches: number;
  battersFaced: number;
}

const HALF_HIT_RESULTS = new Set(["Single", "Double", "Triple", "HomeRun"]);
const HALF_WALK_RESULTS = new Set(["Walk", "IntentionalWalk"]);
const HALF_REACH_RESULTS = new Set([
  "Single", "Double", "Triple", "HomeRun", "Walk", "IntentionalWalk",
  "HitByPitch", "HBP", "Error", "FieldersChoice",
]);

// Plain-language summary of the half that just ended — everything here comes
// from the existing play-by-play feed, no new API data.
export function deriveHalfJustEnded(
  latest: PlayUpdate,
  replayUpdates: readonly PlayUpdate[],
): HalfJustEnded {
  const scoreField: "awayScore" | "homeScore" = latest.half === "top" ? "awayScore" : "homeScore";

  let firstIdx = -1;
  for (let i = 0; i < replayUpdates.length; i++) {
    const u = replayUpdates[i];
    if (u.inning === latest.inning && u.half === latest.half) {
      firstIdx = i;
      break;
    }
  }
  const halfPlays = firstIdx >= 0
    ? replayUpdates.slice(firstIdx).filter((u) => u.inning === latest.inning && u.half === latest.half)
    : [];

  const startScore = firstIdx > 0 ? replayUpdates[firstIdx - 1][scoreField] : (halfPlays[0]?.[scoreField] ?? 0);
  const endScore = halfPlays.length > 0 ? halfPlays[halfPlays.length - 1][scoreField] : startScore;
  const runs = Math.max(0, endScore - startScore);

  const seenAtBats = new Set<number>();
  let hits = 0;
  let walks = 0;
  let reachedBase = false;
  for (const u of halfPlays) {
    if (u.atBatIndex != null) seenAtBats.add(u.atBatIndex);
    if (u.isFinalPitchOfAtBat && u.playResult != null) {
      if (HALF_HIT_RESULTS.has(u.playResult)) hits++;
      if (HALF_WALK_RESULTS.has(u.playResult)) walks++;
      if (HALF_REACH_RESULTS.has(u.playResult)) reachedBase = true;
    }
  }

  const result = runs > 0
    ? `${runs} run${runs === 1 ? "" : "s"} scored`
    : reachedBase
      ? "Scoreless"
      : "Retired in order";

  return {
    result,
    runs,
    hits,
    walks,
    pitches: halfPlays.length,
    battersFaced: seenAtBats.size,
  };
}
