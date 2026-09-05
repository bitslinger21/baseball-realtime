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

export interface DueUpNext {
  batterId: number;
  batterName: string;
  battingOrderSlot: number;
  teamAbbr: string;
}

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
  const nextBatter = lineup[(idx + 1 + lineup.length) % lineup.length];
  if (nextBatter == null) return null;

  return {
    batterId: nextBatter.playerId,
    batterName: nextBatter.name,
    battingOrderSlot: slotOf(nextBatter.battingOrder),
    teamAbbr,
  };
}
