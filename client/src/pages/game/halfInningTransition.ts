import type { BoxScoreDto, BoxScoreSideDto } from "@bitslinger21/baseball-realtime-client";
import type { PlayUpdate } from "../../realtime/types";
import { activeLineup, slotOf } from "./lineupUtils";

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
}

export interface DueUpNext {
  teamAbbr: string;
  batters: DueUpBatter[]; // up to 3, in batting order, next-up first
}

const DUE_UP_COUNT = 3;

export function deriveDueUpNext(
  latest: PlayUpdate,
  boxScore: BoxScoreDto,
  replayUpdates: readonly PlayUpdate[],
  teamAbbrs: { homeAbbr: string; awayAbbr: string },
): DueUpNext | null {
  const wasTop = latest.half === "top";
  const nextBattingSide: BoxScoreSideDto = wasTop ? boxScore.home : boxScore.away;
  const teamAbbr = wasTop ? teamAbbrs.homeAbbr : teamAbbrs.awayAbbr;

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
    batters.push({ batterId: b.playerId, batterName: b.name, battingOrderSlot: slotOf(b.battingOrder) });
  }
  if (batters.length === 0) return null;

  return { teamAbbr, batters };
}
