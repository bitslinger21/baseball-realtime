import type { GameLineupsDto } from "@bitslinger21/scorebook-client";

/** A clock time in the viewer's timezone, no zone label: "7:05p". */
export function fmtClock(ms: number): string {
  return new Date(ms)
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    .replace(/\s?([AaPp])\.?\s?[Mm]\.?/, (_m, x: string) => x.toLowerCase());
}

/** The pregame state the layout shows: projected / official; `none` keeps the single empty card. */
export function pregameLineupState(lineups: GameLineupsDto | null): "projected" | "official" | "none" {
  const away = lineups?.away;
  if (away == null || away.opposingProbable == null || away.batters.length < 3) return "none";
  return away.status === "official" ? "official" : away.status === "projected" ? "projected" : "none";
}
