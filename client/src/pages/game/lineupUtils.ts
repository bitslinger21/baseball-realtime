import type { BatterLineDto } from "@bitslinger21/baseball-realtime-client";
import type { AtBatState } from "../../components/AtBatCard/atBatTypes";

const HIT_RESULTS = new Set(["Single", "Double", "Triple", "HomeRun"]);
const NON_AB_RESULTS = new Set(["Walk", "IntentionalWalk", "HitByPitch", "SacFly", "SacBunt"]);

// "Today" H-for-AB line for an arbitrary batter, from the game's completed at-bats —
// shared by MatchupContext (current/next matchup) and MatchupLeft (due-up tiles) so
// both compute "today" identically.
export function batterTodayLine(
  completedAtBats: readonly AtBatState[],
  batterId: number,
): { h: number; ab: number } {
  const abs = completedAtBats.filter((ab) => ab.batterId === batterId && ab.result != null);
  return {
    h: abs.filter((ab) => HIT_RESULTS.has(ab.result ?? "")).length,
    ab: abs.filter((ab) => !NON_AB_RESULTS.has(ab.result ?? "")).length,
  };
}

// battingOrder is encoded as slot*100 + subDepth (e.g. "300" = slot 3, starter;
// "301" = slot 3, first substitute).

export function slotOf(battingOrder: string | null | undefined): number {
  if (battingOrder == null) return 0;
  const n = parseInt(battingOrder, 10);
  return isNaN(n) ? 0 : Math.floor(n / 100);
}

export function subDepthOf(battingOrder: string | null | undefined): number {
  if (battingOrder == null) return 0;
  const n = parseInt(battingOrder, 10);
  return isNaN(n) ? 0 : n % 100;
}

// Returns the *currently active* batter at each slot (last sub if multiple), sorted 1-9.
export function activeLineup(batting: BatterLineDto[]): BatterLineDto[] {
  const map = new Map<number, BatterLineDto>();
  for (const b of batting) {
    const slot = slotOf(b.battingOrder);
    if (slot === 0) continue;
    const existing = map.get(slot);
    if (existing == null || subDepthOf(b.battingOrder) > subDepthOf(existing.battingOrder)) {
      map.set(slot, b);
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([, b]) => b);
}

// Find the two batters due up after the current batter.
export function dueUp(
  batting: BatterLineDto[],
  currentBatterId: number | null | undefined,
): [BatterLineDto | null, BatterLineDto | null] {
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
