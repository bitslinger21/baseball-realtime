import type { BoxScoreDto } from "@bitslinger21/scorebook-client";
import type { PlayUpdate } from "../../realtime/types";
import type { AtBatState } from "../../components/AtBatCard/atBatTypes";
import { activeLineup, batterTodayLine, isRunnerPlay } from "./lineupUtils";

// At-bat end transitions (PROMPT_oct19.md item 3): what the live view shows the
// moment a PA ends, decided from the play itself rather than waiting for the
// next pitch (or, at game end, the schedule's FINAL).

const REGULATION_INNINGS = 9;

// Part C — does this final pitch end the game? From the play's post-play score,
// inning, half and outs. Shortened / suspended games aren't predictable from a
// play; those still switch when the status becomes final.
export function playEndsGame(u: PlayUpdate | null): boolean {
  if (u == null || u.isFinalPitchOfAtBat !== true || u.inning < REGULATION_INNINGS) return false;
  if (u.half === "top") return u.outs === 3 && u.homeScore > u.awayScore;
  // Bottom half: the home team ahead (a walk-off, any outs), or the 3rd out with
  // the away team ahead. Tied at the 3rd out → extra innings.
  if (u.homeScore > u.awayScore) return true;
  return u.outs === 3 && u.awayScore > u.homeScore;
}

// Outs and bases as the play left them. A pitch's own outs/bases are as of the
// pitch; this play's runner moves (MLB's, in order) carry them forward.
export function postPlayState(u: PlayUpdate): { outs: number; bases: PlayUpdate["bases"] } {
  const on: Record<"1B" | "2B" | "3B", boolean> = { "1B": u.bases.on1, "2B": u.bases.on2, "3B": u.bases.on3 };
  let outs = u.outs;
  for (const m of u.runners ?? []) {
    if (m.start != null) on[m.start] = false;
    if (m.isOut) outs += 1;
    else if (m.end === "1B" || m.end === "2B" || m.end === "3B") on[m.end] = true;
  }
  return { outs: Math.min(outs, 3), bases: { on1: on["1B"], on2: on["2B"], on3: on["3B"] } };
}

// Part B — who's up after `finishedBatterId`: the batting team's active lineup,
// the slot after his. (MLB's own linescore.offense isn't on our wire, so this
// lineup math is the source.) A boxscore refresh that brings in an announced
// pinch hitter changes activeLineup, and with it the answer.
export function nextBatterAfter(
  boxScore: BoxScoreDto,
  half: "top" | "bottom",
  finishedBatterId: number,
): { playerId: number; name: string } | null {
  const lineup = activeLineup((half === "top" ? boxScore.away : boxScore.home).batting);
  if (lineup.length === 0) return null;
  let idx = lineup.findIndex((b) => b.playerId === finishedBatterId);
  if (idx < 0) {
    // He was subbed out of the box score's active lineup after batting: find his slot.
    const all = (half === "top" ? boxScore.away : boxScore.home).batting;
    const slot = all.find((b) => b.playerId === finishedBatterId)?.battingOrder;
    idx = slot != null ? lineup.findIndex((b) => Math.floor(Number(b.battingOrder) / 100) === Math.floor(Number(slot) / 100)) : -1;
  }
  if (idx < 0) return null;
  const b = lineup[(idx + 1) % lineup.length];
  return b?.playerId != null ? { playerId: b.playerId, name: b.name } : null;
}

// Who's up once this play is over: after a runner event (a stolen base, or a
// caught stealing / pickoff that didn't end the half) the same batter is still
// up; otherwise the next slot.
export function batterUpAfter(boxScore: BoxScoreDto, play: PlayUpdate): { playerId: number; name: string } | null {
  if (play.batterId == null) return null;
  if (isRunnerPlay(play.playResult)) return { playerId: play.batterId, name: play.batterName ?? "" };
  return nextBatterAfter(boxScore, play.half, play.batterId);
}

// The projected next batter as an at-bat with no pitches, so the batter card,
// zone, canvas and matchup render him exactly as they will at his first pitch
// (same layout — nothing changes height). Same atBatIndex the real one will get.
export function upNextAtBat(
  finished: PlayUpdate,
  next: { playerId: number; name: string },
  completedAtBats: readonly AtBatState[],
): AtBatState {
  const today = batterTodayLine(completedAtBats, next.playerId);
  return {
    atBatIndex: (finished.atBatIndex ?? -1) + 1,
    batterId: next.playerId,
    batterName: next.name,
    pitcherName: finished.pitcherName,
    inning: finished.inning,
    half: finished.half,
    pitches: [],
    gameAB: today.ab,
    gameH: today.h,
    firstPitchRenderKey: `up-next-${(finished.atBatIndex ?? -1) + 1}`,
    isFirstInInning: false,
    upNext: true,
  };
}
